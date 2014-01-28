
var chai = require('chai');
var should = chai.should();

var dopasswordmachine = require('..');

var passwords = require('./passwords');
var key = 'master-password';

describe('#encrypt() and #decrypt()', function() {
  it('should encrypt and then decrypt a database', function(done) {
    dopasswordmachine.encrypt(passwords, key)
      .then(function(buffer) {
        return dopasswordmachine.decrypt(buffer, key);
      })
      .then(function(data) {
        data.should.eql(passwords.data);
        done();
      })
      .fail(done);
  });
});

describe('#traverse()', function() {
  it('should find the entry in the record', function() {
    dopasswordmachine.traverse(passwords.data, /^area 69$/)
      .should.eql([ {
        path: 'company',
        type: 'directory',
        match: 'area 69',
        index: 0,
        input: 'area 69'
      } ]);
  });
  it('should find deep entry in the record', function() {
    dopasswordmachine.traverse(passwords.data, /^ftp$/)
      .should.eql([ {
        path: 'company 2/area 62',
        type: 'password',
        match: 'ftp',
        index: 0,
        input: 'ftp'
      } ]);
  });
});

describe('Database', function() {
  var database;
  before(function(done) {
    dopasswordmachine.encrypt(passwords, key)
      .then(function(buffer) {
        database = new dopasswordmachine.Database(buffer, key);
        done();
      })
      .fail(done);
  });
  describe('#search()', function() {
    it('should find a namespace', function(done) {
      dopasswordmachine.encrypt(passwords, key)
        .then(function(buffer) {
          return database.search(/^area 6/)
            .then(function(results) {
              results.should.eql([ {
                path: 'company',
                type: 'directory',
                match: 'area 6',
                index: 0,
                input: 'area 69'
              }, {
                path: 'company 2',
                type: 'directory',
                match: 'area 6',
                index: 0,
                input: 'area 62'
              } ]);
              done();
            });
        })
        .fail(done);
    });
  });
  describe('#get()', function() {
    it('should show a password', function(done) {
      database.get('company/area 69/http')
        .then(function(password) {
          password.should.equal('super_mega_secret');
          done();
        })
        .fail(done);
    });
    it('should not fail on invalid path', function(done) {
      database.get('invalid/path')
        .then(function(password) {
          should.equal(null, password);
          done();
        })
        .fail(done);
    });
  });
  describe('#set()', function() {
    it('should set a new password', function(done) {
      database.set('company/password', 'giga_secret')
        .then(function(password) {
          password.should.equal('giga_secret');
          return database.get('company/password');
        })
        .then(function(password) {
          password.should.equal('giga_secret');
          done();
        })
        .fail(done);
    });
  });
  describe('#encrypt()', function() {
    it('should encrypt the database', function(done) {
      database.data
        .then(function(data) {
          return dopasswordmachine.encrypt({
            version: passwords.version,
            data: data
          }, key)
            .then(function(testbuffer) {
              return database.encrypt().then(function(buffer) {
                buffer.should.equal(testbuffer);
                done();
              });
          });
        })
        .fail(done);
    });
  });
});
