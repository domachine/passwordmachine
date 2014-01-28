#!/usr/bin/env node

var fs = require('fs');
var util = require('util');
var path = require('path');

var Q = require('q');
var optimist = require('optimist');
var read = require('read');
require('colors');

var machine = require('..');

var dump = function(database) {
  return database.data.then(function(data) {
    util.print(JSON.stringify({
      version: '~' + machine.FORMAT_VERSION,
      data: data
    }));
  });
};

var search = function(database, pattern) {
  return database.search(pattern)
    .then(function(results) {
      results.forEach(function(result) {
        util.print((result.path !== undefined ? result.path + '/' : ''));
        util.print(result.input.slice(0, result.index));
        util.print(result.match.red.bold);
        util.puts(
          result.input.slice(
            (result.match.length > 0
             ? result.match.length
             : 0)
          )
        );
      });
    });
};

/**
 * Search or a get a value from the database and print it.
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
          util.puts('\nDirectory:'.blue.bold);
          for (var key in result) {
            if (!has.call(result, key)) continue;
            util.puts('  - ' + key.green);
          }
        } else {
          util.print(result);
        }
      });
  }
};

var set = function(database, pattern, value) {
  return database.set(pattern, value);
};

optimist = optimist
  .usage('Usage: $0 [options] <pattern>')
  .describe('v', 'Set a password.')
  .alias('v', 'value')
  .describe('f', 'Use different file as database.')
  .default('f', path.resolve('passwords.json'))
  .alias('f', 'file')
  .describe('e', 'Encrypt a file')
  .alias('e', 'encrypt')
  .boolean('e')
  .describe('V', 'Verbose output')
  .alias('V', 'verbose')
  .boolean('V')
  .describe('d', 'Dump the database.')
  .alias('d', 'dump')
  .boolean('d', 'dump')
  .alias('h', 'help');

var argv = optimist.argv;
var pattern = argv._[0];

if (argv.help) {
  optimist.showHelp();
  process.exit(0);
}

var database = null;
Q.nfcall(fs.readFile, argv.file)
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
      if (argv.value) {
        return set(database, argv._[0], argv.value);
      } else {
        return get(database, argv._[0]);
      }
    });
  })
  .then(function() {
    return database.encrypt();
  })
  .then(function(buffer) {

    // Write the database back to disk.
    return Q.nfcall(fs.writeFile, argv.file, buffer);
  })
  .fail(function(error) {
    if (argv.verbose) {
      util.error(error.stack);
    } else {
      util.error(error.message.red);
    }
  });
