
var Promise = require('bluebird');
// ensure unhandled exceptions are bubbled up
Promise.onPossiblyUnhandledRejection(function(error){
        throw error;
});

var assert = require('assert');
var sinon = require('sinon');
var requireSubvert = require('require-subvert')(__dirname);
//var LdapAuth = require('ldapauth-fork');
/*
var restify    = require('restify');
var database   = require('./database');
var memberdata = require('./memberdata');
*/

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
            originaldata = {
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

            authprovider_find_botuser          = sinon.stub(authprovider, 'find_botuser',
                new Promise.method(function test(data) {
                    assert.equal(data, originaldata);
                    assert.equal(data.callorder_test, undefined);
                    data.callorder_test = 0;
                    return data;
                }));
            authprovider_find_ldapuser         = sinon.stub(authprovider, 'find_ldapuser',
                new Promise.method(function test(data) {
                    assert.equal(data, originaldata);
                    assert.equal(data.callorder_test, 0);
                    data.callorder_test++;
                    return data;
                }));
            authprovider_find_config_flags     = sinon.stub(authprovider, 'find_config_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, originaldata);
                    assert.equal(data.callorder_test, 1);
                    data.callorder_test++;
                    return data;
                }));
            authprovider_find_database_flags   = sinon.stub(authprovider, 'find_database_flags',
                new Promise.method(function test(data) {
                    assert.equal(data, originaldata);
                    assert.equal(data.callorder_test, 2);
                    data.callorder_test++;
                    return data;
                }));
            authprovider_impersonate           = sinon.stub(authprovider, 'impersonate',
                new Promise.method(function test(data) {
                    assert.equal(data, originaldata);
                    assert.equal(data.callorder_test, 3);
                    data.callorder_test++;
                    return data;
                }));
            authprovider_effective_permissions = sinon.stub(authprovider, 'effective_permissions',
                new Promise.method(function test(data) {
                    assert.equal(data, originaldata);
                    assert.equal(data.callorder_test, 4);
                    data.callorder_test++;
                    return data;
                }));
            return authprovider.authorize(originaldata)
            .then(function(data) {
                assert.equal(data, originaldata);
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
        it("should return a UnauthorizedError when an unsupported password hashing algorithm is used", function() {
            return authprovider.find_botuser({
                "config": {
                    "auth": {
                        "bots": {
                            "testuser": "$tralala"
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
                assert.equal(e.name, 'UnauthorizedError');
                assert.equal(e.statusCode, 401);
                assert.equal(e.message, 'Not authorized!');
            });
        });
        it("should return a UnauthorizedError when an invalid password is used for a known bot", function() {
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
            });
        });
        it("should return the input data with the username set when configured botuser & password match", function() {
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
            ldap_closed = false;
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
            ldapauth_stub = sinon.stub();
            ldapconn_mock = sinon.mock(ldapConnApi);
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
            ldap_closed = false;
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
            ldapauth_stub = sinon.stub();
            ldapconn_mock = sinon.mock(ldapConnApi);
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
            ldap_closed = false;
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
            ldapauth_stub = sinon.stub();
            ldapconn_mock = sinon.mock(ldapConnApi);
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
            log_tested = false;
            log_debug = function(logtag,logdata) {
                try {
                    assert.equal(logtag, 'CFLAGS');
                    assert.deepEqual(logdata, [
                        '_anonymous_'
                    ]);
                    log_tested = true;
                } catch(e) {
                    log_tested = e;
                }
            };
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
                assert.strictEqual(log_tested, true);
            });
        });
        it("should return the input data with basic flags + _self_ set when user asks about himself", function() {
            log_tested = false;
            log_debug = function(logtag,logdata) {
                try {
                    assert.equal(logtag, 'CFLAGS');
                    assert.deepEqual(logdata, [
                        '_anonymous_',
                        '_self_'
                    ]);
                    log_tested = true;
                } catch(e) {
                    log_tested = e;
                }
            };
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
                assert.strictEqual(log_tested, true);
            });
        });
        it("should return the input data with basic + additional flags when configured", function() {
            log_tested = false;
            log_debug = function(logtag,logdata) {
                try {
                    assert.equal(logtag, 'CFLAGS');
                    assert.deepEqual(logdata, [
                        '_anonymous_',
                        '_something_'
                    ]);
                    log_tested = true;
                } catch(e) {
                    log_tested = e;
                }
            };
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
                assert.strictEqual(log_tested, true);
            });
        });
        it("should return the input data with basic + additional flags when configured as well as _self_ set when user asks about himself", function() {
            log_tested = false;
            log_debug = function(logtag,logdata) {
                try {
                    assert.equal(logtag, 'CFLAGS');
                    assert.deepEqual(logdata, [
                        '_anonymous_',
                        '_self_',
                        '_something_'
                    ]);
                    log_tested = true;
                } catch(e) {
                    log_tested = e;
                }
            };
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
                assert.strictEqual(log_tested, true);
            });
        });
    });
});
/*
module.exports = {
    find_config_flags: Promise.method(function find_config_flags(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #5");

        // basic flags
        v.flags = [ "_anonymous_" ];

        if (v.username == v.request.params.crewname)
            v.flags.push("_self_");

        if (v.config.auth.flags[v.username] !== undefined)
            v.flags = v.flags.concat(v.config.auth.flags[v.username]);

        v.request.log.debug('CFLAGS', v.flags);
        return v;
    }),
    find_database_flags: Promise.method(function find_database_flags(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #6");

        return database.memberlookup(v.username).then(function(data){
            v.request.log.debug('MEMBERLOOKUP', data);
            realstatus = memberdata.realstatus(data);
            v.request.log.debug('ROHSTATUS', data.Kennung3, 'REALSTATUS', realstatus);
            if (realstatus === 'crew')
                v.flags.push('_member_');
            else if (realstatus === 'raumfahrer')
                v.flags.push('_astronaut_');
            else if (realstatus === 'passiv')
                v.flags.push('_passive_');
            v.request.log.debug('DFLAGS', v.flags);
            return v;
        }).catch(function(){
            return v;
        });
    }),
    impersonate: Promise.method(function impersonate(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #7");

        if (v.request.query.impersonate === undefined)
            return v;

        if (v.request.query.impersonate === v.username)
            return v;

        if (v.flags.indexOf('_admin_') < 0 &&
            v.flags.indexOf('_board_') < 0)
            throw new restify.errors.UnauthorizedError("Not authorized. #8");

        v.request.log.debug('IMPERSONATE', v.request.query.impersonate);
        v.username = v.request.query.impersonate;
        return module.exports.find_config_flags(v)
               .then(module.exports.find_database_flags);
    }),
    effective_permissions: Promise.method(function effective_permissions(v) {
        if (v.username === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #8");

        level = 255;
        v.permission = v.permissions._anonymous_;

        for (var flag in v.permissions) {
            if (v.permissions[flag].level < level)
                if (v.flags.indexOf(flag) > -1) {
                    v.permission = v.permissions[flag];
                    level = v.permission[level];
                }
        }

        v.request.log.debug('PERMISSION', v.permission);

        if (v.permission === undefined)
            throw new restify.errors.UnauthorizedError("Not authorized. #9");

        for (var key in v.permission)
            v[key] = v.permission[key];
        return v;
    })
};
*/
