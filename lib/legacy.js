

var database     = require('./database');   // database connectivity
var memberdata   = require('./memberdata'); // Our memberdata conversion module
var csv          = require('fast-csv');     // CSV generation

module.exports = {
  monitor: function legacyMonitor(req, res, next) {
    database.checkBackendOkay(function legacyMonitorBackendAnswer(err, result) {
    if (err) {
      return next(err);
    } else if (result)
      res.send({'status': 'OK'});
    else
      res.send({'status': 'BROKEN'});
    return next();
    });
  },
/*
  memberlist_oldformat: function memberlist_oldformat(req, res, next) {
    memberlist = database.getMemberList(function memberlist_csv(err, recordset) {
      if (err) {
        return next(err);
      } else {
        csv.writeToStream(res, recordset, {
          headers: true,
          delimiter: ';',
          rowDelimiter: '\n',
          transform: function transform_row(row) {
            // IN:  AdrNr;Firma;Nachname;Vorname;Crewname;Rohstatus;Ext_Mail;Paten;Eintritt;Austritt
            // OUT: Nachname;Vorname;Crewname;Status;externe E-Mail;Eintritt;Paten;Weiteres
            return {
              'Nachname':       row.Nachname,
              'Vorname':        row.Vorname,
              'Crewname':       row.Crewname,
              'Status':         memberdata.realstatus(row),
              'externe E-Mail': row.Ext_Mail,
              'Eintritt':       memberdata.datum(row.Eintritt),
              'Paten':          memberdata.cleanpaten(row.Paten),
              'Weiteres':       ''
            };
          }
        });
      }
      return next();
    });
  }
*/
};
