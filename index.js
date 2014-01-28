
var crypto = require('crypto');

var Q = require('q');
var semver = require('semver');

/**
 * The version of the database format.
 */

var FORMAT_VERSION = exports.FORMAT_VERSION = '1.0.0';

/**
 * Algorithm used to perform the encryption/decryption.
 */

var algorithm = exports.algorithm = 'aes256';

/**
 * Encrypt a JS object using a `key`.
 *
 * @private
 */

var encrypt = exports.encrypt = function(data, key) {
  var deferred = Q.defer();
  var cipher = crypto.createCipher(algorithm, key);
  var encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
    + cipher.final('hex');
  deferred.resolve(encrypted);
  return deferred.promise;
};

/**
 * Decrypt a database to a JS object and verify the version.
 *
 * @private
 */

var decrypt = exports.decrypt = function(buffer, key) {
  var deferred = Q.defer();
  var decipher = crypto.createDecipher(algorithm, key);
  var decrypted = decipher.update(buffer, 'hex', 'utf8')
    + decipher.final('utf8');
  var db = JSON.parse(decrypted);
  if (db.version == null) {
    deferred.reject(new Error('Failed to decrypt.'));
  } else if (!semver.satisfies(FORMAT_VERSION, db.version)) {
    deferred.reject(new Error('Database version mismatch.'));
  } else {
    deferred.resolve(db.data);
  }
  return deferred.promise;
};

/**
 * Traverse record to query the keys against a pattern.
 *
 * @private
 */

var traverse = exports.traverse = function(record, pattern, path) {
  var has = Object.hasOwnProperty;
  var match;
  var results = [];
  for (var key in record) {
    if (!has.call(record, key)) continue;
    match = key.match(pattern);
    if (match) {
      results.push({
        path: path,
        match: match[0],
        index: match.index,
        input: key
      });
      if (typeof record[key] === 'object') {
        results.slice(-1)[0].type = 'directory';
      } else {
        results.slice(-1)[0].type = 'password';
      }
    }
    if (typeof record[key] === 'object') {
      results = results.concat(
        traverse(record[key], pattern, (path ? path + '/' + key : key))
      );
    }
  }
  return results;
};

/**
 * API to interact with the database.
 *
 * @param {String} buffer The encrypted data.
 * @param {String} key The password to decrypt it.
 */

exports.Database = function(buffer, key) {
  var data = decrypt(buffer, key);
  var modified = false;

  Object.defineProperties(this, {
    data: { value: data },
    modified: {
      get: function() {
        return modified;
      }
    }
  });

  /**
   * Search for a pattern within the database.
   */

  this.search = function(pattern) {
    return data.then(function(data) {
      return traverse(data, pattern);
    });
  };

  /**
   * Get a specific password from the database.
   */

  this.get = function(path) {
    return data.then(function(data) {
      var parts = path.split('/');
      var expression = 'data';
      var result = parts.reduce(function(record, key) {
        return record[key] || {};
      }, data);
      if (typeof result === 'string') {
        return result;
      }
      return Object.keys(result).length === 0
        ? null
        : result;
    });
  };

  /**
   * Set a specific password in the database.
   */

  this.set = function(path, value) {
    return data.then(function(data) {
      var parts = path.split('/');
      var expression = 'data';
      var result = parts
        .slice(0, -1)
        .filter(function(part) {
          return !!part;
        })
        .reduce(function(record, key) {
          if (record[key] === undefined) {
            modified = false || modified;
            return record[key] = {};
          }
          modified = true;
          return record[key];
        }, data);
      return result[parts.slice(-1)[0]] = value;
    });
  };

  /**
   * Encrypt the database to write it back to disk.
   */

  this.encrypt = function(_key) {
    if (_key == null) {
      _key = key;
    }
    return data.then(function(data) {
      return encrypt({ version: '~' + FORMAT_VERSION, data: data }, _key);
    });
  };

  /**
   * Remove a key from the database.
   */

  this.remove = function(path) {
    return data.then(function(data) {
      var parts = path.split('/');
      var expression = 'data';
      var result = parts
        .slice(0, -1)
        .filter(function(part) {
          return !!part;
        })
        .reduce(function(record, key) {
          if (record[key] === undefined) {
            modified = false || modified;
            return record[key] = {};
          }
          modified = true;
          return record[key];
        }, data);
      delete result[parts.slice(-1)[0]];
    });
  };
};
