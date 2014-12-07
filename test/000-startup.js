restify = require('restify');
assert = require('assert');
sinon = require('sinon');
sql = require('mssql');

// simulate SQL server
sqlconnection = sinon.stub(sql, 'Connection');
sqlconnection.prototype.connect = function (foo) { foo(false); };

before(function(done) {
  process.env.CTEWARD_ST_LEXWARE_CONFIG = 'st-lexware-test.json';
  if (process.env.CTEWARD_COV == 1)
    require('../lib-cov/startup').startup();
  else
    require('../lib/startup').startup();
  done();
});
