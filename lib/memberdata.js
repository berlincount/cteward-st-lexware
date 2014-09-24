var strptime = require('micro-strptime').strptime;
var trim = require('trim');

// conversion helper functions
function realstatus(member) {
  // re-normalize information encoded in status
  status = member.Rohstatus;

  // unset status? it's a member, if in doubt
  if (!status || status === '')
    status = 'crew';

  // status says it needs checking? it's a member, if in doubt
  if (status.lastIndexOf('check', 0) === 0)
    status = 'crew';

  // crew with flag? it's a member
  if (status.lastIndexOf('crew', 0) === 0)
    status = 'crew';

  // passiv with flag? passiv
  if (status.lastIndexOf('passiv', 0) === 0)
    status = 'passiv';

  // member has a set end date?
  if (member.Austritt && member.Austritt !== '') {
    austritt = strptime(member.Austritt, '%Y%m%d');

    // honor end date (was valid 'til yesterday?)
    if (austritt-1 < new Date()) {
      switch (status) {
        case 'crew':       status = 'ex-crew'; break;
        case 'passiv':     status = 'ex-crew'; break;
        case 'raumfahrer': status = 'ex-raumfahrer'; break;
      }
    }
  }

  if (member.Crewname && member.Crewname !== '') {
    // get information encoded in crewname (ugh)
    // FIXME: get rid of these special cases
    if (member.Crewname.lastIndexOf('disabled-', 0) === 0)
      status = 'ex-crew';
  }

  return status;
}

function datum(isodate) {
  if (typeof isodate != 'string' || isodate.length != 8)
    return '1.1.1970';

  date = strptime(isodate, '%Y%m%d');
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
  cleanpaten: cleanpaten,
  patenarray: patenarray,
};
