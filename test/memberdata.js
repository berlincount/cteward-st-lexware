var assert = require('assert');
var sinon = require('sinon');

// our test subject
memberdata = require('../lib/memberdata');

describe('lib: memberdata', function() {
    describe('realstatus', function() {
        it("should return a TypeError when called without data", function(done) {
            assert.throws(function(){ memberdata.realstatus(); }, 'TypeError');

            done();
        });
        it("should return member as 'crew' if the contract didn't end (yet), normalizing different (old/legacy/broken) status types", function(done) {
            // data in raw format as stored in backend database
            assert.equal(memberdata.realstatus({ "Kennung3": "crew "}),      'crew');
            assert.equal(memberdata.realstatus({ "Kennung3": "crew-af"}),    'crew');
            assert.equal(memberdata.realstatus({ "Kennung3": "check11-af"}), 'crew');
            assert.equal(memberdata.realstatus({ "Kennung3": ""}),           'crew');
            assert.equal(memberdata.realstatus({ "Kennung3": null}),         'crew');

            done();
        });
        it("should return member as 'raumfahrer' if the contract didn't end (yet), normalizing different (old/legacy/broken) status types", function(done) {
            // data in raw format as stored in backend database
            assert.equal(memberdata.realstatus({ "Kennung3": "raumfahrer"}),        'raumfahrer');
            assert.equal(memberdata.realstatus({ "Kennung3": "raumfahrer-foobar"}), 'raumfahrer');

            done();
        });
        it("should pass through other directly set member status", function(done) {
            assert.equal(memberdata.realstatus({ "Kennung3": "ex-crew"}), 'ex-crew');
            assert.equal(memberdata.realstatus({ "Kennung3": "blocked"}), 'blocked');
            assert.equal(memberdata.realstatus({ "Kennung3": "passiv"}),  'passiv');

            done();
        });
        it("should return member as 'ex-crew' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            member = {
                "Kennung3": "crew",
                "Austritt": "2013-12-31"
            };

            clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'crew');
            clock = sinon.useFakeTimers(new Date("Tue Dec 31 2013 23:59:59.999 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'crew');
            clock = sinon.useFakeTimers(new Date("Wed Jan  1 2014 00:00:00.000 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew');
            clock = sinon.useFakeTimers(new Date("Fri May 23 2014 23:56:42.423 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew');
            clock.restore();

            done();
        });
        it("should return passive member as 'ex-crew' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            member = {
                "Kennung3": "passive",
                "Austritt": "2013-12-31"
            };

            clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'passiv');
            clock = sinon.useFakeTimers(new Date("Tue Dec 31 2013 23:59:59.999 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'passiv');
            clock = sinon.useFakeTimers(new Date("Wed Jan  1 2014 00:00:00.000 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew');
            clock = sinon.useFakeTimers(new Date("Fri May 23 2014 23:56:42.423 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew');
            clock.restore();

            done();
        });
        it("should return astronaut as 'ex-raumfahrer' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            member = {
                "Kennung3": "raumfahrer",
                "Austritt": "2013-12-31"
            };

            clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'raumfahrer');
            clock = sinon.useFakeTimers(new Date("Tue Dec 31 2013 23:59:59.999 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'raumfahrer');
            clock = sinon.useFakeTimers(new Date("Wed Jan  1 2014 00:00:00.000 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-raumfahrer');
            clock = sinon.useFakeTimers(new Date("Fri May 23 2014 23:56:42.423 GMT+0100").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-raumfahrer');
            clock.restore();

            done();
        });
    });
});
