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
        it("should pass through other directly set member status", function(done) {
            assert.equal(memberdata.realstatus({ "Kennung3": "ex-crew"}), 'ex-crew', 'input: "ex-crew"');
            assert.equal(memberdata.realstatus({ "Kennung3": "blocked"}), 'blocked', 'input: "blocked"');
            assert.equal(memberdata.realstatus({ "Kennung3": "passiv"}),  'passiv',  'input: "passiv"');

            done();
        });
        it("should return member as 'ex-crew' right after the contract ended, and only then", function(done) {
            // data in raw format as stored in backend database
            member = {
                "Kennung3": "crew",
                "Austritt": "2013-12-31" // will be interpreted according to local timezone (set to UTC for testing)
            };

            clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0000").getTime());
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
            member = {
                "Kennung3": "passive",
                "Austritt": "2013-12-31" // will be interpreted according to local timezone (set to UTC for testing)
            };

            clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0000").getTime());
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
            member = {
                "Kennung3": "raumfahrer",
                "Austritt": "2013-12-31" // will be interpreted according to local timezone (set to UTC for testing)
            };

            clock = sinon.useFakeTimers(new Date("Thu May 23 2013 23:56:42.423 GMT+0000").getTime());
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
});

/*
function datum(isodate) {
  if (typeof isodate != 'string' || isodate.length != 8)
    return '1.1.1970';

  date = strptime(isodate, '%Y%m%d');
  return date.getDate()+'.'+(date.getMonth()+1)+'.'+date.getFullYear();
}

function datum_parsed(isodate) {
  date = new Date(isodate);
  if (!date)
    return '1.1.1970';
  return date.getDate()+'.'+(date.getMonth()+1)+'.'+date.getFullYear();
}

function patenarray(patenstr) {
  if (!patenstr)
    return [];

  if (!patenstr.indexOf(','))
    return [ patenstr.trim() ];

  return patenstr.split(',').map(trim);
}

function cleanpaten(patenstr) {
  return patenarray(patenstr).join(',');
}

module.exports = {
  realstatus: realstatus,
  datum: datum,
  datum_parsed: datum_parsed,
  cleanpaten: cleanpaten,
  patenarray: patenarray,
};
*/
