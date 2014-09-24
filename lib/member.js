

var restify      = require('restify');      // RESTful server
var database     = require('./database');   // database connectivity
var memberdata   = require('./memberdata'); // Our memberdata conversion module
var csv          = require('fast-csv');     // CSV generation

module.exports = {
  get: function member_get(req, res, next) {
    if (req.params.id === '') {
      database.getMemberList(function memberlist_reformat(err, recordset) {
        if (err) {
          return next(err);
        } else {
          var formattedlist = {};
          recordset.forEach(function memberlist_entry(entry){
            if (entry.Crewname.indexOf('X', entry.Crewname.length-1) === -1) {
              formattedlist[entry.Crewname] = {
                'status'  : memberdata.realstatus(entry),
                'eintritt': memberdata.datum(entry.Eintritt),
                'paten'   : memberdata.patenarray(entry.Paten),
              };
            }
          });
          res.end(JSON.stringify(formattedlist, null, 2));
          return next();
        }
      });
    } else {
      return next(new restify.errors.NotImplementedError("Not Implemented."));
    }
    /*
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
    */
  }
};
