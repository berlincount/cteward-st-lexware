
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
    describe('effective_permissions', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.effective_permissions()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return a UnauthorizedError when no username was given", function() {
            return authprovider.effective_permissions({
                "config": {}
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #8');
            });
        });
        it("should return a UnauthorizedError when no permissions are found", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs("PERMISSION", undefined).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.effective_permissions({
                "request": {
                    "log": {
                        "debug": log_debug
                    }
                },
                "config": {},
                "username": "testuser",
                "permissions": {},
                "flags": []
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'ForbiddenError');
                assert.equal(e.statusCode, 403);
                assert.equal(e.message, 'The link you followed is either outdated, inaccurate, or the server has been instructed not to let you have it.');
            })
            .finally(function() {
                assert.equal(log_debug.callCount, 1);
            });
        });
        it("should return the input data with the anonymous permissions set when none other can be found", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs("PERMISSION", { "permission_based_variable_for": "anonymous", "level": 254 }).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            var passeddata = {
                "request": {
                    "log": {
                        "debug": log_debug
                    }
                },
                "config": {},
                "username": "testuser",
                "permissions": {
                    "_anonymous_": {
                        "permission_based_variable_for": "anonymous",
                        "level": 254
                    }
                },
                "flags": []
            };
            return authprovider.effective_permissions(passeddata)
            .then(function(data) {
                assert.deepEqual(data,{
                    "request": {
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "config": {},
                    "username": "testuser",
                    "permissions": {
                        "_anonymous_": {
                            "permission_based_variable_for": "anonymous",
                            "level": 254
                        }
                    },
                    "flags": [],
                    "permission": {
                        "permission_based_variable_for": "anonymous",
                        "level": 254
                    },
                    "permission_based_variable_for": "anonymous",
                    "level": 254
                });
            })
            .finally(function() {
                //assert.equal(log_debug.callCount, 1);
            });
        });
        it("should return the input data with the lowest-level permission found set", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs("PERMISSION", { "permission_based_variable_for": "someflag", "level": 10 }).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            var passeddata = {
                "request": {
                    "log": {
                        "debug": log_debug
                    }
                },
                "config": {},
                "username": "testuser",
                "permissions": {
                    "_anonymous_": {
                        "permission_based_variable_for": "anonymous",
                        "level": 254
                    },
                    "_someflag_": {
                        "permission_based_variable_for": "someflag",
                        "level": 10
                    },
                    "_someotherflag_": {
                        "permission_based_variable_for": "someotherflag",
                        "level": 20
                    }
                },
                "flags": [
                    '_anonymous_',
                    '_someflag_',
                    '_someotherflag_'
                ]
            };
            return authprovider.effective_permissions(passeddata)
            .then(function(data) {
                assert.deepEqual(data,{
                    "request": {
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "config": {},
                    "username": "testuser",
                    "permissions": {
                        "_anonymous_": {
                            "permission_based_variable_for": "anonymous",
                            "level": 254
                        },
                        "_someflag_": {
                            "permission_based_variable_for": "someflag",
                            "level": 10
                        },
                        "_someotherflag_": {
                            "permission_based_variable_for": "someotherflag",
                            "level": 20
                        }
                    },
                    "flags": [
                        '_anonymous_',
                        '_someflag_',
                        '_someotherflag_'
                    ],
                    "permission": {
                        "permission_based_variable_for": "someflag",
                        "level": 10
                    },
                    "permission_based_variable_for": "someflag",
                    "level": 10
                });
            })
            .finally(function() {
                assert.equal(log_debug.callCount, 1);
            });
        });
    });
});
