var sinon = require('sinon');
var restify = require('restify');

// stub the database backend used
var database = require('../lib/database');
database_checkBackendOkay = sinon.stub(database, 'checkBackendOkay');

// init the test client
var client = restify.createJsonClient({
    version: '*',
    url: 'http://127.0.0.1:14334'
});

describe('service: /legacy/monitor', function() {
    describe('200 Okay test', function() {
        it('should give a 200 with {"status":"OK"} when everything is okay', function(done) {
            database_checkBackendOkay.callsArgWith(0, null, true);
            client.get('/legacy/monitor', function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                }
                else {
                    if (res.statusCode != 200) {
                        throw new Error('invalid response from /legacy/monitor: '+res.statusCode);
                    } else if (data.status != 'OK') {
                        throw new Error('non-OK response from /legacy/monitor: '+data);
                    }
                    msg = memstream_data.shift();
                    if (msg !== 'anonymous GET /legacy/monitor')
                        throw new Error('logging: different message than expected was logged: '+msg);
                    done();
                }
            });
        });
    });
    describe('Failure tests', function() {
        /*
        it('should give a 503 with {"status":"broken"} when something is wrong', function(done) {
            database_checkBackendOkay.callsArgWith(0, null, false);
            client.get('/legacy/monitor', function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                }
                else {
                    if (res.statusCode != 503) {
                        throw new Error('invalid response from /legacy/monitor: '+res.statusCode);
                    } else if (data.status != 'BROKEN') {
                        throw new Error('non-BROKEN response from /legacy/monitor: '+data);
                    }
                    msg = memstream_data.shift();
                    if (msg !== 'anonymous GET /legacy/monitor')
                        throw new Error('logging: different message than expected was logged: '+msg);
                    done();
                }
            });
        });
        it('should give a 200 with {"status":"OK"} when everything is okay', function(done) {
            database_checkBackendOkay.callsArgWith(0, new Error("SomeModerateError"), null);
            client.get('/legacy/monitor', function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                }
                else {
                    if (res.statusCode != 200) {
                        throw new Error('invalid response from /legacy/monitor: '+res.statusCode);
                    } else if (data.status != 'OK') {
                        throw new Error('non-OK response from /legacy/monitor: '+data);
                    }
                    msg = memstream_data.shift();
                    if (msg !== 'anonymous GET /legacy/monitor')
                        throw new Error('logging: different message than expected was logged: '+msg);
                    done();
                }
            });
        });
        it('should give a 200 with {"status":"OK"} when everything is okay', function(done) {
            database_checkBackendOkay.throws(new Error("SomeDramaticError"));
            client.get('/legacy/monitor', function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                }
                else {
                    if (res.statusCode != 200) {
                        throw new Error('invalid response from /legacy/monitor: '+res.statusCode);
                    } else if (data.status != 'OK') {
                        throw new Error('non-OK response from /legacy/monitor: '+data.status);
                    }
                    msg = memstream_data.shift();
                    if (msg !== 'anonymous GET /legacy/monitor')
                        throw new Error('logging: different message than expected was logged: '+msg);
                    done();
                }
            });
        });
        */
    });
});
