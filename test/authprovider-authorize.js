
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

            var authprovider_find_botuser          = sinon.stub(authprovider, 'find_botuser').callsFake(
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, undefined);
                    data.callorder_test = 0;
                    return data;
                }));
            var authprovider_find_ldapuser         = sinon.stub(authprovider, 'find_ldapuser').callsFake(
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 0);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_find_config_flags     = sinon.stub(authprovider, 'find_config_flags').callsFake(
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 1);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_find_database_flags   = sinon.stub(authprovider, 'find_database_flags').callsFake(
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 2);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_impersonate           = sinon.stub(authprovider, 'impersonate').callsFake(
                new Promise.method(function test(data) {
                    assert.equal(data, passeddata);
                    assert.equal(data.callorder_test, 3);
                    data.callorder_test++;
                    return data;
                }));
            var authprovider_effective_permissions = sinon.stub(authprovider, 'effective_permissions').callsFake(
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
});
