
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
    describe('find_config_flags', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.find_config_flags()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return a UnauthorizedError when no username was given", function() {
            return authprovider.find_config_flags({
                "config": {}
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #5');
            });
        });
        it("should return the input data with basic flags set when nothing else matches", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs('CFLAGS', [ '_anonymous_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_config_flags({
                    "config": {
                        "auth": {
                            "flags": {}
                        }
                    },
                    "request": {
                        "params": {},
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "config": {
                        "auth": {
                            "flags": {}
                        }
                    },
                    "request": {
                        "params": {},
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_'
                    ]
                });
            })
            .finally(function() {
                assert.equal(log_debug.callCount, 1);
            });
        });
        it("should return the input data with basic flags + _self_ set when user asks about himself", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs('CFLAGS', [ '_anonymous_', '_self_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_config_flags({
                    "config": {
                        "auth": {
                            "flags": {}
                        }
                    },
                    "request": {
                        "params": {
                            "crewname": "testuser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "config": {
                        "auth": {
                            "flags": {}
                        }
                    },
                    "request": {
                        "params": {
                            "crewname": "testuser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_',
                        '_self_'
                    ]
                });
            })
            .finally(function() {
                assert.equal(log_debug.callCount, 1);
            });
        });
        it("should return the input data with basic + additional flags when configured", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs('CFLAGS', [ '_anonymous_', '_something_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_config_flags({
                    "config": {
                        "auth": {
                            "flags": {
                                "testuser": [
                                    "_something_"
                                ]
                            }
                        }
                    },
                    "request": {
                        "params": {},
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "config": {
                        "auth": {
                            "flags": {
                                "testuser": [
                                    "_something_"
                                 ]
                            }
                        }
                    },
                    "request": {
                        "params": {},
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_',
                        '_something_'
                    ]
                });
            })
            .finally(function() {
                assert.equal(log_debug.callCount, 1);
            });
        });
        it("should return the input data with basic + additional flags when configured as well as _self_ set when user asks about himself", function() {
            var log_debug = sinon.stub();
            log_debug.withArgs('CFLAGS', [ '_anonymous_', '_self_', '_something_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_config_flags({
                    "config": {
                        "auth": {
                            "flags": {
                                "testuser": [
                                    "_something_"
                                ]
                            }
                        }
                    },
                    "request": {
                        "params": {
                            "crewname": "testuser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "config": {
                        "auth": {
                            "flags": {
                                "testuser": [
                                    "_something_"
                                 ]
                            }
                        }
                    },
                    "request": {
                        "params": {
                            "crewname": "testuser"
                        },
                        "log": {
                            "debug": log_debug
                        }
                    },
                    "username": "testuser",
                    "flags": [
                        '_anonymous_',
                        '_self_',
                        '_something_'
                    ]
                });
            })
            .finally(function() {
                assert.equal(log_debug.callCount, 1);
            });
        });
    });
});
