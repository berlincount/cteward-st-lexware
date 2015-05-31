
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
});
