#!/usr/bin/env node

var fs = require('fs');
var util = require('util');
var path = require('path');

var Q = require('q');
var optimist = require('optimist');
var read = require('read');
require('colors');

var machine = require('..');

optimist = optimist
  .usage('Usage: $0 [options] <pattern>')
  .describe('v', 'Set a password.')
  .alias('v', 'value')
  .describe('f', 'Path to database file.')
  .default('f', path.resolve(process.env.HOME, '.passwordmachine'))
  .alias('f', 'file')
  .describe('e', 'Encrypt a file.')
  .alias('e', 'encrypt')
  .boolean('e')
  .describe('V', 'Verbose output.')
  .alias('V', 'verbose')
  .boolean('V')
  .describe('d', 'Dump the database.')
  .alias('d', 'dump')
  .boolean('d', 'dump')
  .describe('c', 'Create a new database.')
  .alias('c', 'create')
  .describe('r', 'Remove an entry from the database.')
  .alias('r', 'remove')
  .boolean('r')
  .alias('h', 'help');

/**
 * Dump the database.
 *
 * @param {Database} database
 */

var dump = function(database) {
  return database.data.then(function(data) {
    util.print(JSON.stringify({
      version: '~' + machine.FORMAT_VERSION,
      data: data
    }));
  });
};

/**
 * Search through the database and print the results in a nice manner.
 *
 * @param {Database} database
 * @param {RegExp} pattern
 */

var search = function(database, pattern) {
  return database.search(pattern)
    .then(function(results) {
      util.puts('');
      util.puts('total: ' + results.length);
      results.forEach(function(result) {
        util.print(
          result.type === 'directory'
            ? 'd '
            : 'p '
        );
        util.print(
          (result.path !== undefined ? result.path + '/' : '').magenta
        );
        util.print(
          result.type === 'directory'
            ? result.input.slice(0, result.index).blue.bold
            : result.input.slice(0, result.index)
        );
        util.print(result.match.red.bold);
        var sliceStart = result.match.length > 0
          ? result.match.length
          : 0;
        util.print(
          result.type === 'directory'
            ? result.input.slice(sliceStart).blue.bold
            : result.input.slice(sliceStart)
        );
        if (result.type === 'directory') {
          util.puts('/');
        } else {
          util.puts('');
        }
      });
    });
};

/**
 * Search or a get a value from the database and print it.
 *
 * @param {Database} database
 * @param {String} pattern
 */

var get = function(database, pattern) {
  if (pattern[0] === '/') {

    // Perform a search.
    return search(database, pattern.slice(1));
  } else {

    // Perform a get.
    return database.get(pattern)
      .then(function(result) {
        if (result === null) {
          return;
        }
        if (typeof result === 'object') {
          var has = Object.hasOwnProperty;
          util.puts('\ntotal ' + Object.keys(result).length);
          for (var key in result) {
            if (!has.call(result, key)) continue;
            if (typeof result[key] === 'object') {
              util.puts('d ' + key.blue.bold + '/');
            } else {
              util.puts('p ' + key);
            }
          }
        } else {
          util.print(result);
        }
      });
  }
};

/**
 * Set a key in the database.
 *
 * @param {Database} database
 * @param {String} pattern
 * @param {String} value
 */

var set = function(database, pattern, value) {
  return database.set(pattern, value);
};

/**
 * Remove a key from the database.
 *
 * @param {Database} database
 * @param {String} pattern
 */

var remove = function(database, pattern) {
  return database.remove(pattern);
};

var argv = optimist.argv;
var pattern = argv._[0];

if (argv.help) {
  optimist.showHelp();
  process.exit(0);
}
var database = null;
(function() {
  if (argv.create) {
    return Q.nfcall(read, {
      prompt: 'Password: ',
      output: process.stderr,
      silent: true
    }).then(function(password) {
      return machine.encrypt({
        version: '~' + machine.FORMAT_VERSION,
        data: {}
      }, password[0]);
    }).then(function(buffer) {
      return Q.nfcall(fs.writeFile, argv.file, buffer);
    });
  }
  return Q.nfcall(fs.readFile, argv.file)
    .then(function(content) {
      content = content.toString();
      return Q.nfcall(read, {
        prompt: 'Password: ',
        output: process.stderr,
        silent: true
      }).then(function(password) {
        if (argv.encrypt) {
          var data = JSON.parse(content);
          return machine.encrypt(data, password[0])
            .then(function(data) {
              process.stdout.write(data);
            });
        }
        database = new machine.Database(content, password[0]);
        if (argv.dump) {
          return dump(database);
        }
        if (argv._[0] === undefined) {
          throw new Error('Need a pattern.');
        }
        if (argv.remove) {
          if (argv._[0] === undefined) {
            throw new Error('Need a pattern.');
          }
          return remove(database, argv._[0]);
        } else if (argv.value) {
          return set(database, argv._[0], argv.value);
        } else {
          return get(database, argv._[0]);
        }
      });
    });
})().then(function() {
  if (database === null) return;
  if (database.modified) {
    return database.encrypt()
      .then(function(buffer) {

        // Write the database back to disk.
        return Q.nfcall(fs.writeFile, argv.file, buffer);
      });
  }
}).fail(function(error) {
  if (argv.verbose) {
    util.error(error.stack);
  } else {
    util.error(error.message.red);
  }
});
