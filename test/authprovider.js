
var Promise = require('bluebird');
// ensure unhandled exceptions are bubbled up
Promise.onPossiblyUnhandledRejection(function(error){
        throw error;
});

var assert = require('assert');
var sinon = require('sinon');
var requireSubvert = require('require-subvert')(__dirname);
var database   = require('../lib/database');

// our test subject
authprovider = require('../lib/authprovider');

describe('lib: authprovider', function() {
    describe('authorize', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.authorize()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return a UnauthorizedError when called without authentication data AND no permissions defined for anonymous", function() {
            return authprovider.authorize({
                "request": {
                    "authorization": {}
                },
                "permissions": {

                },
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized, anonymous access prohibited.');
            });
        });
        it("should return a UnauthorizedError when called with authentication data other than Basic", function() {
            return authprovider.authorize({
                "request": {
                    "authorization": {
                        "scheme": "WhateverButNotBasic"
                    }
                }
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Only Basic authentication is implemented right now.');
            });
        });
        it("should should call the chain of authentication functions in order, filling in data as expected", function() {
            var passeddata = {
                "config": {
                    "auth": {
                        "bots": {}
                    },
                    "ldap": {}
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic"
                    }
                }
            };

            var authprovider_find_botuser          = sinon.stub(authprovider, 'find_botuser',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, undefined);
                    data.callorder_test = 0;
                    return data;
                }));
            var authprovider_find_ldapuser         = sinon.stub(authprovider, 'find_ldapuser',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 0);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_find_config_flags     = sinon.stub(authprovider, 'find_config_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 1);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_find_database_flags   = sinon.stub(authprovider, 'find_database_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 2);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_impersonate           = sinon.stub(authprovider, 'impersonate',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 3);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_effective_permissions = sinon.stub(authprovider, 'effective_permissions',
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 4);
                    data.callorder_test++;
                    return data;
                }));
            return authprovider.authorize(passeddata)
            .then(function(data) {
                assert.equal(data, passeddata);
                assert.deepEqual(data, {
                    "config": {
                        "auth": {
                            "bots": {}
                        },
                    "ldap": {}
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic"
                        }
                    },
                    "callorder_test": 5
                });
            })
            .finally(function(){
                authprovider_find_botuser.restore();
                authprovider_find_ldapuser.restore();
                authprovider_find_config_flags.restore();
                authprovider_find_database_flags.restore();
                authprovider_impersonate.restore();
                authprovider_effective_permissions.restore();
            });
        });
    });
    describe('find_botuser', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.find_botuser()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return the input data unmodified when a username is already known", function() {
            return authprovider.find_botuser({
                "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data, {
                    "username": "testuser"
                });
            });
        });
        it("should return the input data unmodified when no botuser is found in a configured list", function() {
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {}
                    }
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic",
                        "basic": {
                            "username": "testuser"
                        }
                    }
                }
            })
            .then(function(data) {
                assert.deepEqual(data, {
                    "config": {
                        "auth": {
                            "bots": {}
                        }
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser"
                            }
                        }
                    }
                });
            });
        });
        it("should return a InternalError when an unsupported password hashing algorithm is used", function() {
            check_password = sinon.stub(authprovider, 'check_password');
            check_password.throws(new Error("Some wicked error"));
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {
                            "testuser": "$tralala$"
                        }
                    }
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic",
                        "basic": {
                            "username": "testuser"
                        }
                    }
                }
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'InternalError');
                assert.equal(e.statusCode, 500);
                assert.equal(e.message, 'Some wicked error');
            })
            .finally(function() {
                check_password.restore();
            });
        });
        it("should return a UnauthorizedError when an invalid password (plain) is used for a known bot", function() {
            check_password = sinon.stub(authprovider, 'check_password');
            check_password.withArgs('tralala','password').returns(false);
            check_password.throws(new Error('Unexpected password check'));
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {
                            "testuser": "password"
                        }
                    }
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic",
                        "basic": {
                            "username": "testuser",
                            "password": "tralala"
                        }
                    }
                }
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #2');
            })
            .finally(function() {
                check_password.restore();
            });
        });
        it("should return the input data with the username set when configured botuser & password (plain) match", function() {
            check_password = sinon.stub(authprovider, 'check_password');
            check_password.withArgs('password','password').returns(true);
            check_password.throws(new Error('Unexpected password check'));
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {
                            "testuser": "password"
                        }
                    }
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic",
                        "basic": {
                            "username": "testuser",
                            "password": "password"
                        }
                    }
                }
            })
            .then(function(data) {
                assert.deepEqual(data, {
                    "config": {
                        "auth": {
                            "bots": {
                                "testuser": "password"
                            }
                        }
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "password"
                            }
                        }
                    },
                    "username": "testuser"
                });
            })
            .finally(function() {
                check_password.restore();
            });
        });
        it("should return a UnauthorizedError when an invalid password (hashed & salted) is used for a known bot", function() {
            check_password = sinon.stub(authprovider, 'check_password');
            check_password.withArgs('tralala','$something$something').returns(false);
            check_password.throws(new Error('Unexpected password check'));
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {
                            "testuser": "$something$something"
                        }
                    }
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic",
                        "basic": {
                            "username": "testuser",
                            "password": "tralala"
                        }
                    }
                }
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #2');
            })
            .finally(function() {
                check_password.restore();
            });
        });
        it("should return the input data with the username set when configured botuser & password (hashed & salted) match", function() {
            check_password = sinon.stub(authprovider, 'check_password');
            check_password.withArgs('password','$something$something').returns(true);
            check_password.throws(new Error('Unexpected password check'));
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {
                            "testuser": "$something$something"
                        }
                    }
                },
                "request": {
                    "authorization": {
                        "scheme": "Basic",
                        "basic": {
                            "username": "testuser",
                            "password": "password"
                        }
                    }
                }
            })
            .then(function(data) {
                assert.deepEqual(data, {
                    "config": {
                        "auth": {
                            "bots": {
                                "testuser": "$something$something"
                            }
                        }
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "password"
                            }
                        }
                    },
                    "username": "testuser"
                });
            })
            .finally(function() {
                check_password.restore();
            });
        });
    });
    describe('find_ldapuser', function() {
        it("should return a TypeError when called without data", function() {
            return authprovider.find_ldapuser()
            .then(assert.fail)
            .catch(TypeError, function() {});
        });
        it("should return the input data unmodified when a username is already known", function() {
            return authprovider.find_ldapuser({
                "username": "testuser"
            })
            .then(function(data) {
                assert.deepEqual(data, {
                    "username": "testuser"
                });
            });
        });
        it("should return a UnauthorizedError when no LDAP configuration is known", function() {
            return authprovider.find_ldapuser({
                    "config": {}
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized. #3');
            });
        });
        it("should return an InternalError when communication with LDAP server fails", function() {
            // simulate LDAP server access
            var ldap_closed = false;
            var ldapConnApi = {
                authenticate: function(username,password) {
                    assert.equal(username, "testuser");
                    assert.equal(password, "tralala");
                    throw new Error("SomeRandomError");
                },
                close: function() {
                    ldap_closed = true;
                }
            };
            var ldapauth_stub = sinon.stub();
            var ldapconn_mock = sinon.mock(ldapConnApi);
            ldapauth_stub.withArgs("SomeLdapConfig").returns(ldapconn_mock.object);
            requireSubvert.subvert('ldapauth-fork', ldapauth_stub);
            authprovider = requireSubvert.require('../lib/authprovider');

            return authprovider.find_ldapuser({
                    "config": {
                        "ldap": "SomeLdapConfig"
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "tralala"
                            }
                        }
                    }
            })
            .then(assert.fail)
            .catch(function(e) {
                assert.equal(e.name, 'InternalError');
                assert.equal(e.statusCode, 500);
                assert.equal(e.message, 'LDAP connection failed.');
            })
            .finally(function() {
                requireSubvert.cleanUp();
                assert(ldap_closed, "LDAP connection wasn't closed or never opened correctly");
            });
        });
        it("should return the input data unmodified when LDAP-authentication fails", function() {
            // simulate LDAP server access
            var ldap_closed = false;
            var ldapConnApi = {
                authenticate: function(username,password) {
                    assert.equal(username, "testuser");
                    assert.equal(password, "tralala");

                    function InvalidCredentialsError(message){
                        this.name    = 'InvalidCredentialsError';
                        this.message = message;
                    }
                    InvalidCredentialsError.prototype = new Error();
                    throw new InvalidCredentialsError("something the LDAP server would send");
                },
                close: function() {
                    ldap_closed = true;
                }
            };
            var ldapauth_stub = sinon.stub();
            var ldapconn_mock = sinon.mock(ldapConnApi);
            ldapauth_stub.withArgs("SomeLdapConfig").returns(ldapconn_mock.object);
            requireSubvert.subvert('ldapauth-fork', ldapauth_stub);
            authprovider = requireSubvert.require('../lib/authprovider');

            return authprovider.find_ldapuser({
                    "config": {
                        "ldap": "SomeLdapConfig"
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "tralala"
                            }
                        }
                    }
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "config": {
                        "ldap": "SomeLdapConfig"
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "tralala"
                            }
                        }
                    }
                });
            })
            .finally(function() {
                requireSubvert.cleanUp();
                assert(ldap_closed, "LDAP connection wasn't closed or never opened correctly");
            });
        });
        it("should return the input data with the username set when LDAP-authentication succeeds", function() {
            // simulate LDAP server access
            var ldap_closed = false;
            var ldapConnApi = {
                authenticate: function(username,password,callback) {
                    assert.equal(username, "testuser");
                    assert.equal(password, "password");
                    callback(undefined, true);
                },
                close: function() {
                    ldap_closed = true;
                }
            };
            var ldapauth_stub = sinon.stub();
            var ldapconn_mock = sinon.mock(ldapConnApi);
            ldapauth_stub.withArgs("SomeLdapConfig").returns(ldapconn_mock.object);
            requireSubvert.subvert('ldapauth-fork', ldapauth_stub);
            authprovider = requireSubvert.require('../lib/authprovider');

            return authprovider.find_ldapuser({
                    "config": {
                        "ldap": "SomeLdapConfig"
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "password"
                            }
                        }
                    }
            })
            .then(function(data) {
                assert.deepEqual(data,{
                    "config": {
                        "ldap": "SomeLdapConfig"
                    },
                    "request": {
                        "authorization": {
                            "scheme": "Basic",
                            "basic": {
                                "username": "testuser",
                                "password": "password"
                            }
                        }
                    },
                    "username": "testuser",
                });
            })
            .finally(function() {
                requireSubvert.cleanUp();
                assert(ldap_closed, "LDAP connection wasn't closed or never opened correctly");
            });
        });
    });
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
