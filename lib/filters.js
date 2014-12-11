
var Promise      = require('bluebird');
var memberdata   = require('./memberdata'); // Our memberdata conversion module

module.exports = {
  MEMBERLIST_ACTIVE_ONLY: function(v) {
    newdata = [];
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];

      if (v.username == row.Kurzname) {
          newdata.push(row);
          continue;
      }

      realstatus = memberdata.realstatus(row);

      if (realstatus != 'crew' &&
          realstatus != 'raumfahrer' &&
          realstatus != 'passiv')
          continue;

      if (row.Kurzname === '' ||
          row.Kurzname.charAt(0) === 'X')
          continue;

      newrow = {
             'Kurzname':       row.Kurzname,
             'Kennung3':       row.Kennung3,
             'Eintritt':       row.Eintritt,
             'Kontaktwoher':   row.Kontaktwoher,
      };
      if (row.Nachname)
          newrow.Nachname = row.Nachname;
      if (row.Vorname)
          newrow.Vorname = row.Vorname;
      if (row.Austritt)
        newrow.Austritt = memberdata.datum_parsed(row.Austritt);
      newdata.push(newrow);
    }
    v.data = newdata;
    return v;
  },
  MEMBERLIST_SELF_ONLY: function(v) {
    newdata = [];
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];

      if (v.username == row.Kurzname) {
          newdata.push(row);
          break;
      }
    }
    v.data = newdata;
    return v;
  },
  runfilter: Promise.method(function runfilter(v) {
    v.request.log.debug('FILTER', v.filter !== undefined);
    if (v.filter === undefined)
        return v;
    return v.filter(v);
  }),
};
