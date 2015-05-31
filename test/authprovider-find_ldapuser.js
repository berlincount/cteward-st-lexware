
var Promise = require('bluebird');
// ensure unhandled exceptions are bubbled up
Promise.onPossiblyUnhandledRejection(function(error){
        throw error;
});

var assert = require('assert');
var sinon = require('sinon');
var requireSubvert = require('require-subvert')(__dirname);

// our test subject
authprovider = require('../lib/authprovider');

describe('lib: authprovider', function() {
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
});
