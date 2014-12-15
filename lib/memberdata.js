var strptime = require('micro-strptime').strptime;
var trim = require('fasttrim').trim;

// Examine a member record and verify contract status
function realstatus(member) {
    if (member === undefined)
        throw TypeError("Need a member record to work with");

    // re-normalize information encoded in status
    status = member.Kennung3;

    // unset status? it's a member, if in doubt
    if (!status || status === '')
        status = 'crew';

    // status says it needs checking? it's a member, if in doubt
    if (status.lastIndexOf('check', 0) === 0)
        status = 'crew';

    // crew with flag? it's a member
    if (status.lastIndexOf('crew', 0) === 0)
        status = 'crew';

    // raumfahrer with flag? it's an astronaut
    if (status.lastIndexOf('raumfahrer', 0) === 0)
        status = 'raumfahrer';

    // passiv with flag? passiv
    if (status.lastIndexOf('passiv', 0) === 0)
        status = 'passiv';

    // FIXME: we are NOT checking for contract type
    // FIXME: we are NOT checking for contract status
    // FIXME: we are NOT checking for contract standing

    // FIXME: we are NOT checking for entry date (Eintritt)

    // member has a set end date?
    if (member.Austritt && member.Austritt !== '') {
        // get exact end of last day of membership
        austritt = new Date(member.Austritt);
        austritt.setHours(23,59,59,999);

        now = new Date();
        // TZ debugging: console.log("member exit calculation: ", austritt, "<", now, "?");

        // honor end date (was valid 'til yesterday?)
        if (austritt < now) {
            switch (status) {
                case 'crew':       status = 'ex-crew'; break;
                case 'passiv':     status = 'ex-crew'; break;
                case 'raumfahrer': status = 'ex-raumfahrer'; break;
            }
        }
    }
    if (member.Kurzname && member.Kurzname !== '') {
        // get information encoded in crewname (ugh)
        // FIXME: get rid of these special cases on database side
        if (member.Kurzname.lastIndexOf('disabled-', 0) === 0)
            status = 'ex-crew';
    }
    return status;
}

// Take a string in the DB format an convert it to something printable
function datum(isodate) {
    if (typeof isodate != 'string' || isodate.length != 8)
        return '1.1.1970';

    date = strptime(isodate, '%Y%m%d');
    return date.getDate()+'.'+(date.getMonth()+1)+'.'+date.getFullYear();
}

// Take a string an parse it via Javascript, return something printable
function datum_parsed(isodate) {
    date = new Date(isodate);
    if (!date || isNaN(date.valueOf()))
        return '1.1.1970';
    return date.getDate()+'.'+(date.getMonth()+1)+'.'+date.getFullYear();
}

// Take a list of badly whitespaced, comma separated membernames, and return an array
function patenarray(patenstr) {
    if (!patenstr)
        return [];

    if (!patenstr.indexOf(','))
        return [ patenstr.trim() ];

    return patenstr.split(',').map(trim);
}

// Take a list of badly whitespaced, comma separated membernames, and return it cleaned up
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
