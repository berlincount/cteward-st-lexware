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
            assert.equal(memberdata.realstatus({ "Kennung3": "crew"}),       'crew', 'input: "crew"');
            assert.equal(memberdata.realstatus({ "Kennung3": "crew-af"}),    'crew', 'input: "crew-af"');
            assert.equal(memberdata.realstatus({ "Kennung3": "check11-af"}), 'crew', 'input: "check11-af"');
            assert.equal(memberdata.realstatus({ "Kennung3": ""}),           'crew', 'input: ""');
            assert.equal(memberdata.realstatus({ "Kennung3": null}),         'crew', 'input: null');

            done();
        });
        it("should return member as 'raumfahrer' if the contract didn't end (yet), normalizing different (old/legacy/broken) status types", function(done) {
            // data in raw format as stored in backend database
            assert.equal(memberdata.realstatus({ "Kennung3": "raumfahrer"}),        'raumfahrer', 'input: "raumfahrer"');
            assert.equal(memberdata.realstatus({ "Kennung3": "raumfahrer-foobar"}), 'raumfahrer', 'input: "raumfahrer-foobar"');

            done();
        });
        it("should return member as 'ex-crew' if the crewname has a 'disabled-' prefix", function(done) {
            var member = {
                "Kennung3": "crew",
                "Kurzname": "disabled-testuser"
            };
            assert.equal(memberdata.realstatus(member),'ex-crew');

            done();
        });
        it("should pass through other directly set member status", function(done) {
            assert.equal(memberdata.realstatus({ "Kennung3": "ex-crew"}), 'ex-crew', 'input: "ex-crew"');
            assert.equal(memberdata.realstatus({ "Kennung3": "blocked"}), 'blocked', 'input: "blocked"');
            assert.equal(memberdata.realstatus({ "Kennung3": "passiv"}),  'passiv',  'input: "passiv"');

            done();
        });
        it("should return member as 'ex-crew' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            var member = {
                "Kennung3": "crew",
                "Austritt": "2013-12-31" // will be interpreted according to local timezone (set to UTC for testing)
            };

            var clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'crew',    'input: "crew", some time in 2013');
            clock = sinon.useFakeTimers(new Date("Tue Dec 31 2013 23:59:59.000 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'crew',    'input: "crew", a second before midnight');
            clock = sinon.useFakeTimers(new Date("Wed Jan  1 2014 00:00:00.000 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew', 'input: "crew", at midnight');
            clock = sinon.useFakeTimers(new Date("Fri May 23 2014 23:56:42.423 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew', 'input: "crew", some time in 2014');
            clock.restore();

            done();
        });
        it("should return passive member as 'ex-crew' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            var member = {
                "Kennung3": "passive",
                "Austritt": "2013-12-31" // will be interpreted according to local timezone (set to UTC for testing)
            };

            var clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'passiv',  'input: "passiv", some time in 2013');
            clock = sinon.useFakeTimers(new Date("Tue Dec 31 2013 23:59:59.000 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'passiv',  'input: "passiv", a second before midnight');
            clock = sinon.useFakeTimers(new Date("Wed Jan  1 2014 00:00:00.000 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew', 'input: "passiv", at midnight');
            clock = sinon.useFakeTimers(new Date("Fri May 23 2014 23:56:42.423 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-crew', 'input: "passiv", some time in 2014');
            clock.restore();

            done();
        });
        it("should return astronaut as 'ex-raumfahrer' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            var member = {
                "Kennung3": "raumfahrer",
                "Austritt": "2013-12-31" // will be interpreted according to local timezone (set to UTC for testing)
            };

            var clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'raumfahrer',    'input: "raumfahrer", some time in 2013');
            clock = sinon.useFakeTimers(new Date("Tue Dec 31 2013 23:59:59.000 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'raumfahrer',    'input: "raumfahrer", a second before midnight');
            clock = sinon.useFakeTimers(new Date("Wed Jan  1 2014 00:00:00.000 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-raumfahrer', 'input: "raumfahrer", at midnight');
            clock = sinon.useFakeTimers(new Date("Fri May 23 2014 23:56:42.423 GMT+0000").getTime());
            assert.equal(memberdata.realstatus(member), 'ex-raumfahrer', 'input: "raumfahrer", some time in 2014');
            clock.restore();

            done();
        });
    });
    describe('datum', function() {
        it("should return '1.1.1970' when called with invalid data", function(done) {
            assert.equal(memberdata.datum(),               '1.1.1970', "input: nothing");
            assert.equal(memberdata.datum(null),           '1.1.1970', "input: null");
            assert.equal(memberdata.datum("foo"),          '1.1.1970', "input: 'foo'");
            assert.equal(memberdata.datum("201412150000"), '1.1.1970', "input: '201412150000'");

            done();
        });
        it("should return converted dates correctly", function(done) {
            assert.equal(memberdata.datum("19430107"), '7.1.1943',   "input: '19430107'");
            assert.equal(memberdata.datum("19700101"), '1.1.1970',   "input: '19700101'");
            assert.equal(memberdata.datum("20141215"), '15.12.2014', "input: '20141215'");
            assert.equal(memberdata.datum("23880229"), '29.2.2388',  "input: '23880229'");

            done();
        });
    });
    describe('datum_parsed', function() {
        it("should return '1.1.1970' when called with invalid data", function(done) {
            assert.equal(memberdata.datum_parsed(),               '1.1.1970', "input: nothing");
            assert.equal(memberdata.datum_parsed(null),           '1.1.1970', "input: null");
            assert.equal(memberdata.datum_parsed("foo"),          '1.1.1970', "input: 'foo'");
            assert.equal(memberdata.datum_parsed("201412150000"), '1.1.1970', "input: '201412150000'");

            done();
        });
        it("should return converted dates correctly", function(done) {
            assert.equal(memberdata.datum_parsed("1943-01-07"), '7.1.1943',   "input: '1943-01-07'");
            assert.equal(memberdata.datum_parsed("1970-01-01"), '1.1.1970',   "input: '1970-01-01'");
            assert.equal(memberdata.datum_parsed("2014-12-15"), '15.12.2014', "input: '2014-12-15'");
            assert.equal(memberdata.datum_parsed("2388-02-29"), '29.2.2388',  "input: '2388-02-29'");
            assert.equal(memberdata.datum_parsed("Thu, 13 Feb 1969 23:32:54 -0330"), '14.2.1969' /* test TZ=UTC! */,  "input: 'Thu, 13 Feb 1969 23:32:54 -0330'");
            assert.equal(memberdata.datum_parsed("Fri, 21 Nov 1997 09:55:06 -0600"), '21.11.1997', "input: 'Fri, 21 Nov 1997 09:55:06 -0600'");
            assert.equal(memberdata.datum_parsed("Tue, 1 Jul 2003 10:52:37 +0200"),  '1.7.2003',   "input: 'Tue, 1 Jul 2003 10:52:37 +0200'");
            assert.equal(memberdata.datum_parsed("Mon, 15 Dec 2014 01:45:25 +0100"), '15.12.2014', "input: 'Mon, 15 Dec 2014 01:45:25 +0100'");

            done();
        });
    });
    describe('patenarray', function() {
        it("should decode a comma-separated list of members with horrible whitespaces and return an array", function(done) {
            assert.deepEqual(memberdata.patenarray(),            []); //, "input: nothing");
            assert.deepEqual(memberdata.patenarray(null),        [], "input: null");
            assert.deepEqual(memberdata.patenarray("foo"),       [ "foo" ], "input: 'foo'");
            assert.deepEqual(memberdata.patenarray("foo,bar"),   [ "foo","bar"], "input: 'foo,bar'");
            assert.deepEqual(memberdata.patenarray(",foo,bar"),  [ "foo","bar"], ",input: 'foo,bar'");
            assert.deepEqual(memberdata.patenarray("foo,bar,,"), [ "foo","bar"], "input: 'foo,bar,,'");
            assert.deepEqual(memberdata.patenarray(" foo,bar , baz , bam,   muuuh"),
                [ "foo","bar","baz","bam","muuuh" ],
                "input: ' foo,bar , baz , bam,   muuuh'");

            done();
        });
        it("should decode a comma-separated list of members with horrible whitespaces and return a clean string", function(done) {
            assert.equal(memberdata.cleanpaten(),            "", "input: nothing");
            assert.equal(memberdata.cleanpaten(null),        "", "input: null");
            assert.equal(memberdata.cleanpaten("foo"),       "foo", "input: 'foo'");
            assert.equal(memberdata.cleanpaten("foo,bar"),   "foo,bar", "input: 'foo,bar'");
            assert.equal(memberdata.cleanpaten(",foo,bar"),  "foo,bar", "input: ',foo,bar'");
            assert.equal(memberdata.cleanpaten("foo,bar,,"), "foo,bar", "input: 'foo,bar,,'");
            assert.equal(memberdata.cleanpaten(" foo,bar , baz , bam,   muuuh"),
                "foo,bar,baz,bam,muuuh",
                "input: ' foo,bar , baz , bam,   muuuh'");

            done();
        });
    });
});
