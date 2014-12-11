restify = require('restify');
assert = require('assert');
sinon = require('sinon');
sql = require('mssql');

// simulate SQL server
sqlconnection = sinon.stub(sql, 'Connection');
sqlconnection.prototype.connect = function (foo) { foo(false); };

before(function(done) {
  Promise = global.Promise || require('bluebird');
  process.env.CTEWARD_ST_LEXWARE_CONFIG = 'st-lexware-test.json';
  require('../lib/startup').startup();
  done();
});
