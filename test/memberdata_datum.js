var assert = require('assert');

// our test subject
memberdata = require('../lib/memberdata');

describe('lib: memberdata', function() {
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
});
