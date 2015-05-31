
var Promise = require('bluebird');
// ensure unhandled exceptions are bubbled up
Promise.onPossiblyUnhandledRejection(function(error){
        throw error;
});

var assert = require('assert');
var sinon = require('sinon');
var database   = require('../lib/database');

// our test subject
authprovider = require('../lib/authprovider');

describe('lib: authprovider', function() {
    describe('find_database_flags', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.find_database_flags()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return a UnauthorizedError when no username was given", function() {
            return authprovider.find_database_flags({
                "config": {}
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #6');
            });
        });
        it("should return the input data as-is when member lookup fails", function() {
            var database_memberlookup = sinon.stub(database, 'memberlookup',
                new Promise.method(function test() {
                    throw new Error("SomethingOrOther");
                }));
            return authprovider.find_database_flags({
                    "config": {
                        "auth": {
                            "flags": {}
                        }
                    },
                    "request": {
                        "params": {}
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
                        "params": {}
                    },
                    "username": "testuser"
                });
            })
            .finally(function() {
                database_memberlookup.restore();
            });
        });
        it("should return the input data without flags being changed for unexpected status", function() {
            var database_memberlookup = sinon.stub(database, 'memberlookup',
                new Promise.method(function test(username) {
                    assert.equal(username, "testuser");
                    return { "Kennung3": "rohstatus" };
                }));
            var memberdata_realstatus = sinon.stub(memberdata, 'realstatus',
                function test(data) {
                    assert.deepEqual(data, { "Kennung3": "rohstatus" });
                    return "somestatus";
                });
            var log_debug = sinon.stub();
            log_debug.withArgs("MEMBERLOOKUP", { "Kennung3": "rohstatus" }).returns(true);
            log_debug.withArgs("ROHSTATUS", "rohstatus", "REALSTATUS", "somestatus").returns(true);
            log_debug.withArgs('DFLAGS', [ '_anonymous_', '_self_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_database_flags({
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
                database_memberlookup.restore();
                memberdata_realstatus.restore();
                assert.equal(log_debug.callCount, 3);
            });
        });
        it("should return the input data with the proper flag being added for a user with realstatus 'crew'", function() {
            var database_memberlookup = sinon.stub(database, 'memberlookup',
                new Promise.method(function test(username) {
                    assert.equal(username, "testuser");
                    return { "Kennung3": "rohstatus" };
                }));
            var memberdata_realstatus = sinon.stub(memberdata, 'realstatus',
                function test(data) {
                    assert.deepEqual(data, { "Kennung3": "rohstatus" });
                    return "crew";
                });
            var log_debug = sinon.stub();
            log_debug.withArgs("MEMBERLOOKUP", { "Kennung3": "rohstatus" }).returns(true);
            log_debug.withArgs("ROHSTATUS", "rohstatus", "REALSTATUS", "crew").returns(true);
            log_debug.withArgs('DFLAGS', [ '_anonymous_', '_self_', '_member_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_database_flags({
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
                        '_self_',
                        '_member_'
                    ]
                });
            })
            .finally(function() {
                database_memberlookup.restore();
                memberdata_realstatus.restore();
                assert.equal(log_debug.callCount, 3);
            });
        });
        it("should return the input data with the proper flag being added for a user with realstatus 'raumfahrer'", function() {
            var database_memberlookup = sinon.stub(database, 'memberlookup',
                new Promise.method(function test(username) {
                    assert.equal(username, "testuser");
                    return { "Kennung3": "rohstatus" };
                }));
            var memberdata_realstatus = sinon.stub(memberdata, 'realstatus',
                function test(data) {
                    assert.deepEqual(data, { "Kennung3": "rohstatus" });
                    return "raumfahrer";
                });
            var log_debug = sinon.stub();
            log_debug.withArgs("MEMBERLOOKUP", { "Kennung3": "rohstatus" }).returns(true);
            log_debug.withArgs("ROHSTATUS", "rohstatus", "REALSTATUS", "raumfahrer").returns(true);
            log_debug.withArgs('DFLAGS', [ '_anonymous_', '_self_', '_astronaut_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_database_flags({
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
                        '_self_',
                        '_astronaut_'
                    ]
                });
            })
            .finally(function() {
                database_memberlookup.restore();
                memberdata_realstatus.restore();
                assert.equal(log_debug.callCount, 3);
            });
        });
        it("should return the input data with the proper flag being added for a user with realstatus 'passiv'", function() {
            var database_memberlookup = sinon.stub(database, 'memberlookup',
                new Promise.method(function test(username) {
                    assert.equal(username, "testuser");
                    return { "Kennung3": "rohstatus" };
                }));
            var memberdata_realstatus = sinon.stub(memberdata, 'realstatus',
                function test(data) {
                    assert.deepEqual(data, { "Kennung3": "rohstatus" });
                    return "passiv";
                });
            var log_debug = sinon.stub();
            log_debug.withArgs("MEMBERLOOKUP", { "Kennung3": "rohstatus" }).returns(true);
            log_debug.withArgs("ROHSTATUS", "rohstatus", "REALSTATUS", "passiv").returns(true);
            log_debug.withArgs('DFLAGS', [ '_anonymous_', '_self_', '_passive_' ]).returns(true);
            log_debug.throws(new Error("Unexpected logdata"));
            return authprovider.find_database_flags({
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
                        '_self_',
                        '_passive_'
                    ]
                });
            })
            .finally(function() {
                database_memberlookup.restore();
                memberdata_realstatus.restore();
                assert.equal(log_debug.callCount, 3);
            });
        });
    });
});
