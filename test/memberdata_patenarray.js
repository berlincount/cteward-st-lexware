var assert = require('assert');

// our test subject
memberdata = require('../lib/memberdata');

describe('lib: memberdata', function() {
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
