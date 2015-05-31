
var Promise = require('bluebird');
// ensure unhandled exceptions are bubbled up
Promise.onPossiblyUnhandledRejection(function(error){
        throw error;
});

var assert = require('assert');
var sinon = require('sinon');

// our test subject
authprovider = require('../lib/authprovider');

describe('lib: authprovider', function() {
    describe('impersonate', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.impersonate()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return a UnauthorizedError when no username was given", function() {
            return authprovider.impersonate({
                "config": {}
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #7');
            });
        });
        it("should return the input data as-is when no impersonation is requested", function() {
            return authprovider.impersonate({
                    "request": {
                        "query": {}
                    },
                    "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "request": {
                        "query": {}
                    },
                    "username": "testuser"
                });
            });
        });
        it("should return the input data as-is when the user tries to impersonate himself", function() {
            return authprovider.impersonate({
                    "request": {
                        "query": {
                            "impersonate": "testuser"
                        }
                    },
                    "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "request": {
                        "query": {
                            "impersonate": "testuser"
                        }
                    },
                    "username": "testuser"
                });
            });
        });
        it("should return a UnauthorizedError when the user doesn't have a necessary flag", function() {
            return authprovider.impersonate({
                    "request": {
                        "query": {
                            "impersonate": "otheruser"
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_',
                        '_self_'
                    ]
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #8');
            });
        });
        it("should return the input data impersonating otheruser if requestor has _admin_ flag set", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs("IMPERSONATE", "otheruser").returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            var passeddata = {
                    "request": {
                        "query": {
                            "impersonate": "otheruser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_',
                        '_self_',
                        '_admin_'
                    ]
            };
            var authprovider_find_config_flags     = sinon.stub(authprovider, 'find_config_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, undefined);
                    data.callorder_test = 1;
                    return data;
                }));
            var authprovider_find_database_flags   = sinon.stub(authprovider, 'find_database_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 1);
                    data.callorder_test++;
                    return data;
                }));
            return authprovider.impersonate(passeddata)
            .then(function(data) {
                assert.deepEqual(data,{
                    "request": {
                        "query": {
                            "impersonate": "otheruser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "otheruser",
                    "flags": [
                        '_anonymous_',
                        '_self_',
                        '_admin_'
                    ],
                    "callorder_test": 2
                });
            })
            .finally(function() {
                authprovider_find_config_flags.restore();
                authprovider_find_database_flags.restore();
                assert.equal(log_debug.callCount, 1);
            });
        });
        it("should return the input data impersonating otheruser if requestor has _board_ flag set", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs("IMPERSONATE", "otheruser").returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            var passeddata = {
                    "request": {
                        "query": {
                            "impersonate": "otheruser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_',
                        '_self_',
                        '_board_'
                    ]
            };
            var authprovider_find_config_flags     = sinon.stub(authprovider, 'find_config_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, undefined);
                    data.callorder_test = 1;
                    return data;
                }));
            var authprovider_find_database_flags   = sinon.stub(authprovider, 'find_database_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 1);
                    data.callorder_test++;
                    return data;
                }));
            return authprovider.impersonate(passeddata)
            .then(function(data) {
                assert.deepEqual(data,{
                    "request": {
                        "query": {
                            "impersonate": "otheruser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "otheruser",
                    "flags": [
                        '_anonymous_',
                        '_self_',
                        '_board_'
                    ],
                    "callorder_test": 2
                });
            })
            .finally(function() {
                authprovider_find_config_flags.restore();
                authprovider_find_database_flags.restore();
                assert.equal(log_debug.callCount, 1);
            });
        });
    });
});
