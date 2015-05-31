var assert = require('assert');

// our test subject
memberdata = require('../lib/memberdata');

describe('lib: memberdata', function() {
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
});
