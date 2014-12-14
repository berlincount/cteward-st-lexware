var restify = require('restify');
var assert = require('assert');

// init the test client
var client = restify.createJsonClient({
    version: '*',
    url: 'http://127.0.0.1:14334'
});

describe('service: /legacy/monitor', function() {
    describe('200 OK test', function() {
        it('should give a 200 with {"status":"OK"} when everything is okay', function(done) {
            // stub database access
            database_checkBackendOkay.callsArgWith(0, null, true);

            // test server
            client.get('/legacy/monitor', function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                } else {
                    // check basic content
                    assert.equal(res.statusCode, 200, 'unexpected HTTP statusCode: '+res.statusCode);
                    assert.equal(data.status, 'OK', 'unexpected data: '+data);

                    // check server logging
                    logmsg = memstream_data.shift();
                    assert.equal(logmsg, 'anonymous GET /legacy/monitor', 'unexpected log message: '+logmsg);

                    done();
                }
            });
        });
    });
    describe('Failure tests', function() {
        it('should give a 503 with {"status":"BROKEN"} on DB inconsistency', function(done) {
            // stub database access
            database_checkBackendOkay.callsArgWith(0, null, false);

            // test server
            client.get('/legacy/monitor', function(err, req, res, data) {
                // check basic content
                assert(err, "failure didn't cause error");
                assert.equal(res.statusCode, 503, 'unexpected HTTP statusCode: '+res.statusCode);
                assert.equal(data.status, 'BROKEN', 'unexpected data: '+data);

                // check server logging
                logmsg = memstream_data.shift();
                assert.equal(logmsg, 'anonymous GET /legacy/monitor', 'unexpected log message: '+logmsg);

                done();
            });
        });

        it('should give a 500 with {"message":"SomeModerateError"} on SomeModerateError exception', function(done) {
            // stub database access
            database_checkBackendOkay.callsArgWith(0, new Error("SomeModerateError"), null);

            // test server
            client.get('/legacy/monitor', function(err, req, res, data) {
                // check basic content
                assert(err, "failure didn't cause error");
                assert.equal(res.statusCode, 500, 'unexpected HTTP statusCode: '+res.statusCode);
                assert.equal(data.message, 'SomeModerateError', 'unexpected data: '+data);

                // check server logging
                logmsg = memstream_data.shift();
                assert.equal(logmsg, 'anonymous GET /legacy/monitor', 'unexpected log message: '+logmsg); 

                done();
            });
        });
    });
});
