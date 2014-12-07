var restify      = require('restify');      // RESTful server
var database     = require('./database');   // database connectivity
var memberdata   = require('./memberdata'); // Our memberdata conversion module
var csv          = require('fast-csv');     // CSV generation

module.exports = {
  /*
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
      database.getMemberRaw(req.params.id, function member_reformat(err, recordset) {
        if (err) {
          return next(err);
        } else if (recordset.length != 1) {
          return next(new Error('Nothing or too much found.'));
        } else {
          var member = recordset[0];
          // massage data
          member.Status   = memberdata.realstatus(member);
          member.Eintritt = memberdata.datum(member.Eintritt);
          member.Paten    = memberdata.patenarray(member.Paten);
          if (member.Kurzname)
            if (member.Kurzname.charAt(0) == 'X')
              member.Kurzname = null;
          // convert dates
          datefields = {
            'Erf_Datum'    : 'verwaltung_erfasst',
            'Aender_Dat'   : 'verwaltung_geaendert',
            'Geburtsdatum' : 'geburtsdatum',
            'Eintritt'     : 'eintritt',
            'Austritt'     : 'austritt',
          };

          // mapmember
          member_map = {
            'Kurzname'     : 'crewname',
            'AdrNr'        : 'adressnummer',
            'MITGLNR'      : 'mitgliedsnummer',
            'Erf_Datum'    : 'verwaltung_erfasst',
            'Aender_Dat'   : 'verwaltung_geaendert',
            'Benutzer'     : 'verwaltung_benutzer',
            'Ben_Erfass'   : 'verwaltung_benutzererfasser',
            'Ben_Aender'   : 'verwaltung_benutzeraender',
            'Jahr'         : 'verwaltung_jahr',
            'Aktiv'        : 'verwaltung_aktiv',
            'Status'       : 'status',
            'Geburtsdatum' : 'geburtsdatum',
            'Paten'        : 'paten',
            'Eintritt'     : 'eintritt',
            'Austritt'     : 'austritt',
            'Zahlungsart'  : 'zahlungsart',
            'Zahlungsweise': 'zahlungsweise',
            'Firma1'       : 'anschrift_firma',
            'Betreung'     : 'anschrift_geschlecht',
            'Anredetitel'  : 'anschrift_titel',
            'Vorname'      : 'anschrift_vorname',
            'Nachname'     : 'anschrift_nachname',
            'Strasse'      : 'anschrift_strasse',
            'PLZ'          : 'anschrift_plz',
            'Ort'          : 'anschrift_ort',
            'Vorwahl'      : 'kontakt_vorwahl',
            'Telefon1'     : 'kontakt_telefon',
            'Telefon5'     : 'kontakt_telefongeschaeft',
            'Telefon6'     : 'kontakt_telefonmobil',
            'Telefon3'     : 'kontakt_externeemail',
            'Bank1'        : 'kontodaten_bank',
            'BLZ1'         : 'kontodaten_blz',
            'BIC1'         : 'kontodaten_bic',
            'Konto1'       : 'kontodaten_konto',
            'IBAN1'        : 'kontodaten_iban',
            'mandatsrefenz': 'kontodaten_mandatsnr',
            'AbwKontoInh'  : 'kontodaten_andererinhaber'
          };
          result = {};
          for (var key in member)
            if (member.hasOwnProperty(key) && member[key])
              if (member_map.hasOwnProperty(key))
                //if (datefields.hasOwnProperty(key))
                //  result[member_map[key]] = Date.parse(member[key]);
                //else
                  result[member_map[key]] = member[key];
          res.end(JSON.stringify(result, null, 2));
          return next();
        }
      });
    }
  },

  getRaw: function member_get_raw(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member raw data only provided for individual members.'));
    } else {
      database.getMemberRaw(req.params.id, function member_return_reformatted(err, recordset) {
        if (err) {
          return next(err);
        } else if (recordset.length != 1) {
          return next(new Error('Nothing or too much found.'));
        } else {
          res.end(JSON.stringify(recordset[0], null, 2));
          return next();
        }
      });
    }
  },

  getContract: function member_get_contract(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member contract data only provided for individual members.'));
    } else {
      database.getMemberContract(req.params.id, req.params.contract, function member_return_contract(err, recordset) {
        if (err) {
          return next(err);
        } else {
          res.end(JSON.stringify(recordset, null, 2));
          return next();
        }
      });
    }
  },

  getDebit: function member_get_debit(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member debit data only provided for individual members.'));
    } else {
      database.getMemberDebit(req.params.id, req.params.debit, function member_return_debit(err, recordset) {
        if (err) {
          return next(err);
        } else {
          res.end(JSON.stringify(recordset, null, 2));
          return next();
        }
      });
    }
  },

  getWithdrawal: function member_get_withdrawal(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member withdrawal data only provided for individual members.'));
    } else {
      database.getMemberWithdrawal(req.params.id, req.params.withdrawal, function member_return_withdrawal(err, recordset) {
        if (err) {
          return next(err);
        } else {
          res.end(JSON.stringify(recordset, null, 2));
          return next();
        }
      });
    }
  }
  */
};
