var memberdata   = require('./memberdata'); // Our memberdata conversion module
module.exports = {
  NONE:                  function(v) {
    return v;
  },
  CONTRACT:              function(v) {
    // empty if fail
    if (v.data.length != 1) {
      v.data = {}; return v;
    }
    // calculated data
    newdata = {
        'Vertragsnummer':   parseInt(v.data[0].VertragNr),
        'Vertragsart':      v.data[0].ArtName,
        'Sollstellung':     v.data[0].Sollstellung,
        'Betrag':           v.data[0].Betrag,
        'Vertragsbeginn':   memberdata.datum_parsed(v.data[0].VertragBegin)
    };
    if (v.data[0].VertragEnde)
      newdata.Vertragsende = memberdata.datum_parsed(v.data[0].VertragEnde);
    Verwendungszweck = [];
    if (v.data[0].VerwZw1 && v.data[0].VerwZw1 !== '')
       Verwendungszweck.push(v.data[0].VerwZw1);
    if (v.data[0].VerwZw2 && v.data[0].VerwZw2 !== '')
       Verwendungszweck.push(v.data[0].VerwZw2);
    if (v.data[0].VerwZw3 && v.data[0].VerwZw3 !== '')
       Verwendungszweck.push(v.data[0].VerwZw3);
    if (v.data[0].VerwZw4 && v.data[0].VerwZw4 !== '')
       Verwendungszweck.push(v.data[0].VerwZw4);
    if (Verwendungszweck.length)
       newdata.Verwendungszweck = Verwendungszweck;
    newdata.url = v.config.base + v.request.path();
    v.data = newdata;
    return v;
  },
  CONTRACTLIST:          function(v) {
    // FIXME: wtfy
    newdata = {
      "count": 0,
      "next": null,
      "prev": null,
      "results": []
    };
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];
      newrow = {
             'Vertragsnummer':   parseInt(row.VertragNr),
             'Vertragsart':      row.ArtName,
             'Sollstellung':     row.Sollstellung,
             'Betrag':           row.Betrag,
             'Vertragsbeginn':   memberdata.datum_parsed(row.VertragBegin)
      };
      if (row.VertragEnde)
        newrow.Vertragsende = memberdata.datum_parsed(row.VertragEnde);
      newrow.url = v.config.base + v.request.path() + newrow.Vertragsnummer;
      newdata.results.push(newrow);
    }
    newdata.count = newdata.results.length;
    v.data = newdata;
    return v;
  },
  DEBIT:                 function(v) {
    // empty if fail
    if (v.data.length != 1) {
      v.data = {}; return v;
    }
    // calculated data
      row = v.data[0];
      newrow = {
             'Vertragsnummer':   parseInt(row.VertragNr),
             'Vertrag':          v.config.base + v.request.path() + '../contract/' + parseInt(row.VertragNr),
             'Jahr':             row.Jahr,
             'Monat':            row.Monat,
             'Art':              row.ArtName,
             'Datum':            memberdata.datum_parsed(row.Datum),
             'Betrag':           row.Betrag  || 0,
             'Bezahlt':          row.Bezahlt || 0,
             'Offen':            row.Offen   || 0
      };
      //if (row.VertragEnde)
      //  newrow.Vertragsende = memberdata.datum_parsed(row.VertragEnde);
      if (row.GUID)
          newrow.url = v.config.base + v.request.path() + row.GUID;
    v.data = newrow;
    return v;
  },
  DEBITLIST:             function(v) {
    // FIXME: wtfy
    newdata = {
      "count": 0,
      "next": null,
      "prev": null,
      "results": []
    };
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];
      newrow = {
             'Vertragsnummer':   parseInt(row.VertragNr),
             'Vertrag':          v.config.base + v.request.path() + '../contract/' + parseInt(row.VertragNr),
             'Jahr':             row.Jahr,
             'Monat':            row.Monat,
             'Art':              row.ArtName,
             'Datum':            memberdata.datum_parsed(row.Datum),
             'Betrag':           row.Betrag  || 0,
             'Bezahlt':          row.Bezahlt || 0,
             'Offen':            row.Offen   || 0
      };
      if (row.GUID)
          newrow.url = v.config.base + v.request.path() + row.GUID;
      newdata.results.push(newrow);
    }
    newdata.count = newdata.results.length;
    v.data = newdata;
    return v;
  },
  MEMBER:                function(v) {
    // empty if fail
    if (v.data.length != 1) {
      v.data = {}; return v;
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
    newdata.url = v.config.base + v.request.path();
    newdata.Email = v.data[0].Kurzname + "@c-base.org";
    newdata.contracts = v.config.base + v.request.path() + '/contract/';
    newdata.debits = v.config.base + v.request.path() + '/debit/';
    newdata.withdrawals = v.config.base + v.request.path() + '/withdrawal/';
    v.data = newdata;
    return v;
  },
  MEMBERLIST:            function(v) {
    // FIXME: wtfy
    newdata = {
      "count": 0,
      "next": null,
      "prev": null,
      "results": []
    };
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];
      newrow = {
             'Crewname':       row.Kurzname,
             'Status':         memberdata.realstatus(row),
             'Eintritt':       memberdata.datum_parsed(row.Eintritt),
             'Paten':          memberdata.patenarray(row.Kontaktwoher),
      };
      if (row.Nachname)
          newrow.Nachname = row.Nachname;
      if (row.Vorname)
          newrow.Vorname = row.Vorname;
      if (row.Kurzname && row.Kurzname !== '' && row.Kurzname.charAt(0) !== 'X') {
         newrow.url = v.config.base + v.request.path() + row.Kurzname;
         newrow.Email = row.Kurzname + "@c-base.org";
      }
      if (row.Austritt)
        newrow.Austritt = memberdata.datum_parsed(row.Austritt);
      if (row.Telefon3 && row.Telefon3 !== '')
        newrow.Ext_Email = row.Telefon3;
      newdata.results.push(newrow);
    }
    newdata.count = newdata.results.length;
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
    // empty if fail
    if (v.data.length != 1) {
      v.data = {}; return v;
    }
    // calculated data
      row = v.data[0];
      newrow = {
             'Vertragsnummer':   parseInt(row.VertragNr),
             'Vertrag':          v.config.base + v.request.path() + '../contract/' + parseInt(row.VertragNr),
             'BLZ':              row.Adr_BLZ || '',
             'Konto':            row.Adr_Konto || '',
             'IBAN':             row.IBAN || '',
             'BIC':              row.BIC || '',
             'Mandat':           row.MandatsNr || '',
             'Betrag':           row.Betrag_EU || 0,
             'Jahr':             row.Jahr,
             'Monat':            row.Zeitraum,
             'Datum':            memberdata.datum_parsed(row.ErstDatum)
      };
      Verwendungszweck = [];
      if (row.Zweck_1 && row.Zweck_1 !== '')
         Verwendungszweck.push(row.Zweck_1);
      if (row.Zweck_2 && row.Zweck_2 !== '')
         Verwendungszweck.push(row.Zweck_2);
      if (Verwendungszweck.length)
         newrow.Verwendungszweck = Verwendungszweck;
      if (row.GUID)
          newrow.url = v.config.base + v.request.path() + row.GUID;
    v.data = newrow;
    return v;
  },
  WITHDRAWALLIST:        function(v) {
    // FIXME: wtfy
    newdata = {
      "count": 0,
      "next": null,
      "prev": null,
      "results": []
    };
    for (var i = 0; i<v.data.length; i++) {
      row = v.data[i];
      newrow = {
             'Vertragsnummer':   parseInt(row.VertragNr),
             'Vertrag':          v.config.base + v.request.path() + '../contract/' + parseInt(row.VertragNr),
             'BLZ':              row.Adr_BLZ || '',
             'Konto':            row.Adr_Konto || '',
             'IBAN':             row.IBAN || '',
             'BIC':              row.BIC || '',
             'Mandat':           row.MandatsNr || '',
             'Betrag':           row.Betrag_EU || 0,
             'Jahr':             row.Jahr,
             'Monat':            row.Zeitraum,
             'Datum':            memberdata.datum_parsed(row.ErstDatum)
      };
      Verwendungszweck = [];
      if (row.Zweck_1 && row.Zweck_1 !== '')
         Verwendungszweck.push(row.Zweck_1);
      if (row.Zweck_2 && row.Zweck_2 !== '')
         Verwendungszweck.push(row.Zweck_2);
      if (Verwendungszweck.length)
         newrow.Verwendungszweck = Verwendungszweck;
      if (row.GUID)
          newrow.url = v.config.base + v.request.path() + row.GUID;
      newdata.results.push(newrow);
    }
    newdata.count = newdata.results.length;
    v.data = newdata;
    return v;
  }
};
