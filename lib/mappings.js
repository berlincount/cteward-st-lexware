var Promise      = require('bluebird');
var memberdata   = require('./memberdata'); // Our memberdata conversion module
module.exports = {
  NONE:                  function(v) {
    return v;
  },
  CONTRACT:              function(v) {
    console.log("y01");
    return v;
  },
  CONTRACTLIST:          function(v) {
    console.log("y02");
    return v;
  },
  DEBIT:                 function(v) {
    console.log("y03");
    return v;
  },
  DEBITLIST:             function(v) {
    console.log("y04");
    return v;
  },
  MEMBER:                function(v) {
    // empty if fail
    if (v.data.length != 1) {
      v.data = []; return v;
    }
    // calculated data
    newdata = {
        Eintritt:       memberdata.datum_parsed(v.data[0].Eintritt),
        Paten:          memberdata.patenarray(v.data[0].Kontaktwoher),
    };
    // straight mappings
    varlist = {
      "Vorname":       "Vorname",
      "Nachname":      "Nachname",
      "Strasse":       "Strasse",
      "PLZ":           "PLZ",
      "Ort":           "Ort",
      "Kurzname":      "Crewname",
      "Firma4":        "Firma",
      "Telefon1":      "Telefon",
      "Bank1":         "Bank",
      "BLZ1":          "BLZ",
      "IBAN1":         "IBAN",
      "BIC1":          "BIC",
      "Konto1":        "Konto",
      "mandatsrefenz": "Mandatreferenz",
      "Telefon3":      "Ext_Email",
      "Zahlungsweise": "Zahlungsweise",
      "EinzugLastMandLiegtVor": "Lastschriftmandat",
    };
    for (var key in varlist)
      if (v.data[0][key] && v.data[0][key] !== '')
        newdata[varlist[key]] = v.data[0][key];
    // optional mappings
    if (v.data[0].Geburtsdatum)
        newdata.Geburtsdatum = memberdata.datum_parsed(v.data[0].Geburtsdatum);
    if (v.data[0].Austritt)
        newdata.Austritt = memberdata.datum_parsed(v.data[0].Austritt);
    if (v.data[0].Zahlungsart)
        switch(v.data[0].Zahlungsart) {
            case 'B': newdata.Zahlungsart = 'Bar'; break;
            case 'L': newdata.Zahlungsart = 'Lastschrift'; break;
            case 'U': newdata.Zahlungsart = 'Überweisung'; break;
        }
    if (v.data[0].AdrNr)
        newdata.Adressnummer = v.data[0].AdrNr;
    if (v.data[0].MITGLNR)
        newdata.Mitgliedsnummer = parseInt(v.data[0].MITGLNR);
    // special data
    newdata.Status = memberdata.realstatus(v.data[0]);
    v.data[0] = newdata;
    return v;
  },
  MEMBERLIST:            function(v) {
    // FIXME: wtfy
    newdata = [];
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];
      newrow = {
             'Nachname':       row.Nachname,
             'Vorname':        row.Vorname,
             'Crewname':       row.Kurzname,
             'Status':         memberdata.realstatus(row),
             'Eintritt':       memberdata.datum_parsed(row.Eintritt),
             'Paten':          memberdata.patenarray(row.Kontaktwoher),
      };
      if (row.Austritt)
        newrow.Austritt = memberdata.datum_parsed(row.Austritt);
      if (row.Telefon3 && row.Telefon3 !== '')
        newrow.Ext_Email = row.Telefon3;
      newdata.push(newrow);
    }
    v.data = newdata;
    return v;
  },
  MEMBERLIST_TO_LDAPCSV: function(v) {
    // FIXME: wtfy
    newdata = [];
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];
      newrow = {
             'Nachname':       row.Nachname,
             'Vorname':        row.Vorname,
             'Crewname':       row.Kurzname,
             'Status':         memberdata.realstatus(row),
             'externe E-Mail': row.Telefon3,
             'Eintritt':       memberdata.datum_parsed(row.Eintritt),
             'Paten':          memberdata.cleanpaten(row.Kontaktwoher),
             'Weiteres':       ''
      };
      newdata.push(newrow);
    }
    v.data = newdata;
    return v;
  },
  WITHDRAWAL:            function(v) {
    console.log("y09");
    return v;
  },
  WITHDRAWALLIST:        function(v) {
    console.log("y10");
    return v;
  },

  runmapping: Promise.method(function runmapping(v) {
    console.log(JSON.stringify(v.data));
    console.log(JSON.stringify(v.mapping));
    return v;
  }),
};
