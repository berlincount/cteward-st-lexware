
var Promise = require('bluebird');
// ensure unhandled exceptions are bubbled up
Promise.onPossiblyUnhandledRejection(function(error){
        throw error;
});

var assert = require('assert');

// our test subject
authprovider = require('../lib/authprovider');

describe('lib: authprovider', function() {
    describe('check_password', function() {
        it("should return true for matching plaintext passwords", function() {
            assert.equal(true, authprovider.check_password('foo','foo'));
        });
        it("should return false for mismatching plaintext passwords", function() {
            assert.equal(false, authprovider.check_password('foo','bar'));
        });
        it("should return a Error when called with bad algo selection", function() {
            var exc;
            try {
                authprovider.check_password('irrelevant','$something');
            } catch (e) {
                exc = e;
                assert.equal(e.name,    'Error');
                assert.equal(e.message, 'Password hashing algorithm not selected');
            }
            assert.notEqual(undefined, exc);
        });
        it("should return a Error when called with unsupported algo selection", function() {
            var exc;
            try {
                authprovider.check_password('irrelevant','$something$');
            } catch (e) {
                exc = e;
                assert.equal(e.name,    'Error');
                assert.equal(e.message, 'Unsupported password hashing algorithm used');
            }
            assert.notEqual(undefined, exc);
        });
        it("should return false for mismatching hashed passwords", function() {
            assert.equal(false, authprovider.check_password('bar','$apr1$ryrASnKv$9uu3GLC0w/.rE7nPheugZ/'));
        });
        it("should return true for matching hashed passwords", function() {
            assert.equal(true, authprovider.check_password('foo','$apr1$ryrASnKv$9uu3GLC0w/.rE7nPheugZ/'));
        });
    });
});
