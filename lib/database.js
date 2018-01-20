var Promise = require('bluebird');
var sql     = require('mssql');    // Microsoft SQL access
sql.Promise = Promise;

var connection   = null;
var is_connected = false;
var connecterr   = new Error("Not connected (yet).");

function tryconnect(err) {
  if (err) {
    is_connected = false;
    connecterr   = err;
  } else {
    is_connected = true;
    connecterr   = null;
  }
}

module.exports = {
  init: function(config) {
    if (!config)
      config = {};

    connection = new sql.ConnectionPool({
      user:     config.user     || 'readonly',
      password: config.password || 'XXXXXXXXXXXXXXXX',
      server:   config.server   || 'localhost',
      database: config.database || 'Linear',
      pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000
      }
    });
    connection.connect(tryconnect);
  },

  connected: function(v) {
    if (is_connected)
      return true;

    // just retry
    v.request.log.debug('CONNECTED: not connected, retrying');
    if (connection && !connection.connecting)
      connection.connect(tryconnect);

    //v.request.log.debug('CONNECTED: connected');
    return false;
  },

  checkBackendOkay: function checkBackendOkay(callback, v) {
    if (!callback)
      throw new Error('callback missing for checkBackendOkay');

    if (!module.exports.connected(v)) {
      throw new Error("Database connection failed.");
    }

    var request = new sql.Request(connection);
    v.request.log.debug('CHECKBACKENDOKAY: synchronous member count check');
    request.query('SELECT COUNT(*) AS MemberCount FROM Adresse', function(err, dbresponse) {
      if (err) throw new Error('Database access failed (#1).');

      recordset = dbresponse.recordset;
      if (recordset[0].MemberCount < 7) throw new Error('Too few members.');
    });
    v.request.log.debug('CHECKBACKENDOKAY: synchronous member duplicate check');
    request.query('SELECT Kurzname AS Crewname,COUNT(*) FROM Adresse GROUP BY Kurzname HAVING COUNT(*) > 1', function(err, dbresponse) {
      if (err) throw new Error('Database access failed (#2).');

      recordset = dbresponse.recordset;
      if (recordset.length > 0) throw new Error('Duplicate membernames.');
    });
    v.request.log.debug('CHECKBACKENDOKAY: all fine');
    return callback(null, true);
  },

  runquery: Promise.method(function runquery(v) {
    if (!v.query)
      throw new Error('query missing for query');

    if (v.query.special)
      v.request.log.debug('RUNQUERY: running special',v.query.special);
      switch (v.query.special) {
        case module.exports.QUERY_STATS_MEMBERS.special:
          return module.exports.runquery_stats_members(v);
        case module.exports.QUERY_STATS_CONTRACTS.special:
          return module.exports.runquery_stats_contracts(v);
        case module.exports.QUERY_STATS_GENDERS.special:
          return module.exports.runquery_stats_genders(v);
        case module.exports.QUERY_STATS_AGES.special:
          return module.exports.runquery_stats_ages(v);
      }
    if (!v.query.statement)
      throw new Error('statement missing for query');
    if (!v.query.params)
      throw new Error('params missing for query');

    v.request.log.debug('RUNQUERY: checking backend');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw new Error('Database behaviour inconsistent.');
    }, v);

    v.request.log.debug('RUNQUERY: assembling query',v.query.statement);
    var request = new sql.Request(connection);
    // check whether all parameters were given
    for (var key in v.query.params)
      if (!v.request.params.hasOwnProperty(key))
        throw new Error('not all params given for query');
      else
        request.input(key, v.query.params[key], v.request.params[key]);

    v.request.log.debug('RUNQUERY: running query',v.query.statement);
    return request.query(v.query.statement).then(function(dbresponse) {
      data = dbresponse.recordset;
      v.data = data;
      return v;
    });
  }),

  runquery_stats_members: Promise.method(function runquery_stats_members(v) {
    if (!v.query)
      throw new Error('query missing for query');
    if (!v.query.special)
      throw new Error('special missing for query');
    if (v.query.special != "QUERY_STATS_MEMBERS")
      throw new Error('unexpected special');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw new Error('Database behaviour inconsistent.');
    }, v);

    var request = new sql.Request(connection);
    return request.query("SELECT MIN(Eintritt) AS EintrittMin,MAX(Eintritt) AS EintrittMax,MIN(Austritt) AS AustrittMin,MAX(Austritt) AS AustrittMax FROM Adresse").then(function(dbresponse) {
      var mindate = Date.now();
      var maxdate = Date.now();
      data = dbresponse.recordset;
      for (var key in data[0]) {
        var chkdate = Date.parse(data[0][key]);
        if (mindate > chkdate)
          mindate = chkdate;
        if (maxdate < chkdate)
          maxdate = chkdate;
      }
      v.mindate = new Date(mindate);
      v.maxdate = new Date(maxdate);

      data = [mindate,maxdate];
      var year = v.mindate.getFullYear();
      var month = v.mindate.getMonth()+1;
      var queries = [];
      var ps = new sql.PreparedStatement(connection);
      ps.input('yearstr',sql.VarChar);
      ps.input('monthstr',sql.VarChar);
      return ps.prepare("SELECT CAST(@yearstr AS INT) AS Year,CAST(@monthstr AS INT) AS Month,COUNT(Kurzname) AS Members FROM Adresse WHERE Eintritt<CAST(@monthstr+'/28/'+@yearstr AS DATETIME) AND (Austritt IS NULL OR Austritt='' OR Austritt>CAST(@monthstr+'/28/'+@yearstr AS DATETIME))", function () {
        for (; year <= v.maxdate.getFullYear(); year++) {
          for (; (year < v.maxdate.getFullYear() && month <= 12)||(month <= v.maxdate.getMonth()+1); month++) {
            queries.push(ps.execute({yearstr: year, monthstr: month}));
          }
          month = 1;
        }

        return Promise.all(queries).then(function(data) {
          ps.unprepare();
          var result = [];
          // only use the first row of each recordset returned, there should be only one anyway
          for (var i=0; i < data.length; i++)
            result.push(data[i][0]);
          v.data = result;
          return v;
        });
      });
    });
  }),

  runquery_stats_contracts: Promise.method(function runquery_stats_contracts(v) {
    if (!v.query)
      throw new Error('query missing for query');
    if (!v.query.special)
      throw new Error('special missing for query');
    if (v.query.special != "QUERY_STATS_CONTRACTS")
      throw new Error('unexpected special');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw new Error('Database behaviour inconsistent.');
    }, v);

    var request = new sql.Request(connection);
    return request.query("SELECT MIN(VertragBegin) AS VertragBeginMin,MAX(VertragBegin) AS VertragBeginMax,MIN(VertragEnde) AS VertragEndeMin,MAX(VertragEnde) AS VertragEndeMax FROM MgVert").then(function(dbresponse) {
      var mindate = Date.now();
      var maxdate = Date.now();
      data = dbresponse.recordset;
      for (var key in data[0]) {
        var chkdate = Date.parse(data[0][key]);
        if (mindate > chkdate)
          mindate = chkdate;
        if (maxdate < chkdate)
          maxdate = chkdate;
      }
      v.mindate = new Date(mindate);
      v.maxdate = new Date(maxdate);

      data = [mindate,maxdate];
      var year = v.mindate.getFullYear();
      var month = v.mindate.getMonth()+1;
      var queries = [];
      var ps = new sql.PreparedStatement(connection);
      ps.input('yearstr',sql.VarChar);
      ps.input('monthstr',sql.VarChar);
      return ps.prepare("SELECT CAST(@yearstr AS INT) AS Year,CAST(@monthstr AS INT) AS Month,COUNT(ArtName) AS Contracts,ArtName AS ContractName FROM MgVert WHERE VertragBegin<CAST(@monthstr+'/28/'+@yearstr AS DATETIME) AND (VertragEnde IS NULL OR VertragEnde='' OR VertragEnde>CAST(@monthstr+'/28/'+@yearstr AS DATETIME)) GROUP BY ArtName", function () {
        for (; year <= v.maxdate.getFullYear(); year++) {
          for (; (year < v.maxdate.getFullYear() && month <= 12)||(month <= v.maxdate.getMonth()+1); month++) {
            queries.push(ps.execute({yearstr: year, monthstr: month}));
          }
          month = 1;
        }

        return Promise.all(queries).then(function(data) {
          ps.unprepare();
          var result = [];
          for (var i=0; i < data.length; i++) {
            var period = {
              Year: data[i][0].Year,
              Month: data[i][0].Month,
              Contracts: []
            };
            for (var j=0; j < data[i].length; j++)
              period.Contracts.push({
                Type: data[i][j].ContractName,
                Count: data[i][j].Contracts
              });
            result.push(period);
          }
          v.data = result;
          return v;
        });
      });
    });
  }),

  runquery_stats_genders: Promise.method(function runquery_stats_genders(v) {
    if (!v.query)
      throw new Error('query missing for query');
    if (!v.query.special)
      throw new Error('special missing for query');
    if (v.query.special != "QUERY_STATS_GENDERS")
      throw new Error('unexpected special');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw new Error('Database behaviour inconsistent.');
    }, v);

    var request = new sql.Request(connection);
    return request.query("SELECT MIN(Eintritt) AS EintrittMin,MAX(Eintritt) AS EintrittMax,MIN(Austritt) AS AustrittMin,MAX(Austritt) AS AustrittMax FROM Adresse").then(function(dbresponse) {
      var mindate = Date.now();
      var maxdate = Date.now();
      data = dbresponse.recordset;
      for (var key in data[0]) {
        var chkdate = Date.parse(data[0][key]);
        if (mindate > chkdate)
          mindate = chkdate;
        if (maxdate < chkdate)
          maxdate = chkdate;
      }
      v.mindate = new Date(mindate);
      v.maxdate = new Date(maxdate);

      data = [mindate,maxdate];
      var year = v.mindate.getFullYear();
      var month = v.mindate.getMonth()+1;
      var queries = [];

      for (; year <= v.maxdate.getFullYear(); year++) {
        for (; (year < v.maxdate.getFullYear() && month <= 12)||(month <= v.maxdate.getMonth()+1); month++) {
          //console.log({yearstr: year, monthstr: month});
          q1 = new sql.Request(connection);
          q2 = q1.input('yearstr', sql.VarChar, year);
          q3 = q2.input('monthstr',sql.VarChar, month);
          q4 = q3.query("SELECT CAST(@yearstr AS INT) AS Year,CAST(@monthstr AS INT) AS Month,Anrede,COUNT(Anrede) AS Anreden,Betreung AS Geschlecht,COUNT(Betreung) AS Geschlechter,Firma4 AS Firmenname FROM Adresse WHERE Eintritt<CAST(@monthstr+'/28/'+@yearstr AS DATETIME) AND (Austritt IS NULL OR Austritt='' OR Austritt>CAST(@monthstr+'/28/'+@yearstr AS DATETIME)) GROUP BY Anrede,Betreung,Firma4");
          // console.log(q4);
          queries.push(q4);
        }
        month = 1;
      }

      return Promise.all(queries).then(function(data) {
        var result = [];
        // educated guessing on the gender of members
        for (var i=0; i < data.length; i++) {
          record = data[i].recordset;
          entry = {
            "Year": record[0].Year,
            "Month": record[0].Month,
            "Male": 0,
            "Female": 0,
            "Business": 0,
            "Other": 0,
          };
          //console.log("===================================");
          for (var j=0; j < record.length; j++) {
            //console.log(record[j]);
            if (record[j].Firmenname !== null && record[j].Firmenname !== '' && record[j].Firmenname.indexOf('c/o ') === -1) {
              entry.Business+=record[j].Anreden;
              //console.log("Business += "+record[j].Anreden);
            } else if (record[j].Geschlecht == 'MÄNNLICH') {
              entry.Male+=record[j].Geschlechter;
              //console.log("Male += "+record[j].Geschlechter);
            } else if (record[j].Geschlecht == 'WEIBLICH') {
              entry.Female+=record[j].Geschlechter;
              //console.log("Female += "+record[j].Geschlechter);
            } else if (record[j].Anrede == 'Herr') {
              entry.Male+=record[j].Anreden;
              //console.log("Male += "+record[j].Anreden);
            } else if (record[j].Anrede == 'Frau') {
              entry.Female+=record[j].Anreden;
              //console.log("Female += "+record[j].Anreden);
            } else {
              entry.Other+=record[j].Anreden;
              //console.log("Other += "+record[j].Anreden);
            }
          }
          result.push(entry);
        }
        v.data = result;
        return v;
      });
    });
  }),

  runquery_stats_ages: Promise.method(function runquery_stats_ages(v) {
    if (!v.query)
      throw new Error('query missing for query');
    if (!v.query.special)
      throw new Error('special missing for query');
    if (v.query.special != "QUERY_STATS_AGES")
      throw new Error('unexpected special');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw new Error('Database behaviour inconsistent.');
    }, v);

    var request = new sql.Request(connection);
    return request.query("SELECT MIN(Eintritt) AS EintrittMin,MAX(Eintritt) AS EintrittMax,MIN(Austritt) AS AustrittMin,MAX(Austritt) AS AustrittMax FROM Adresse").then(function(dbresponse) {
      var mindate = Date.now();
      var maxdate = Date.now();
      data = dbresponse.recordset;
      for (var key in data[0]) {
        var chkdate = Date.parse(data[0][key]);
        if (mindate > chkdate)
          mindate = chkdate;
        if (maxdate < chkdate)
          maxdate = chkdate;
      }
      v.mindate = new Date(mindate);
      v.maxdate = new Date(maxdate);

      data = [mindate,maxdate];
      var year = v.mindate.getFullYear();
      var month = v.mindate.getMonth()+1;
      var queries = [];
      var ps = new sql.PreparedStatement(connection);
      ps.input('yearstr',sql.VarChar);
      ps.input('monthstr',sql.VarChar);
      return ps.prepare("SELECT CAST(@yearstr AS INT) AS Year,CAST(@monthstr AS INT) AS Month,DATEPART(YEAR,Geburtsdatum) AS Geburtsjahr,COUNT(*) AS Anzahl FROM Adresse WHERE Eintritt<CAST(@monthstr+'/28/'+@yearstr AS DATETIME) AND (Austritt IS NULL OR Austritt='' OR Austritt>CAST(@monthstr+'/28/'+@yearstr AS DATETIME)) GROUP BY DATEPART(YEAR,Geburtsdatum)", function () {
        for (; year <= v.maxdate.getFullYear(); year++) {
          for (; (year < v.maxdate.getFullYear() && month <= 12)||(month <= v.maxdate.getMonth()+1); month++) {
            queries.push(ps.execute({yearstr: year, monthstr: month}));
          }
          month = 1;
        }

        return Promise.all(queries).then(function(data) {
          ps.unprepare();
          var result = [];
          var thisyear  = new Date().getFullYear();

          // default limits, overridable
          var limit_min = 20;
          var limit_max = 60;
          var step      = 10;
          if ('step' in v.request.params && parseInt(v.request.params.step) > 0)
            step = parseInt(v.request.params.step);
          if ('min' in v.request.params && parseInt(v.request.params.min) >= 0)
            limit_min = parseInt(v.request.params.min);
          if ('max' in v.request.params && parseInt(v.request.params.max) >= 0)
            limit_max = parseInt(v.request.params.max);
          // order wrong? don't care, compensate
          if (limit_min > limit_max) {
            var tmp = limit_min;
            limit_min = limit_max;
            limit_max = tmp;
          }
          // make limit work as year
          if (limit_min > 200)
            limit_min -= thisyear;
          if (limit_max > 200)
            limit_max -= thisyear;
          for (var i=0; i < data.length; i++) {
            entry = {
              "Year": data[i][0].Year,
              "Month": data[i][0].Month,
            };
            var minage = 9001;
            var maxage = 0;
            //console.log("===================================");
            for (var j=0; j < data[i].length; j++) {
              //console.log(data[i][j]);
              // it's over 9000!!
              if (data[i][j].Geburtsjahr) {
                age = thisyear - data[i][j].Geburtsjahr;

                if (limit_min && age < limit_min)
                    label = "< "+limit_min+" (> "+(thisyear-limit_min)+")";
                else if (limit_max && age > limit_max)
                    label = "> "+limit_max+" (< "+(thisyear-limit_max)+")";
                else {
                    if (step == 1) {
                      label     = age+" ("+(thisyear-age)+")";

                      if (age < minage)
                          minage = age;
                      if (age > maxage)
                          maxage = age;
                    } else {
                      startage  = age - (age % step);
                      endage    = startage + step;

                      label     = startage+"-"+(endage-1)+" ("+(thisyear-endage)+"-"+(thisyear-startage-1)+")";

                      if (startage < minage)
                        minage = startage;
                      if (endage   > maxage)
                       maxage = endage;
                    }
                }
              } else
                label = "Other";

              if (label in entry)
                entry[label] += data[i][j].Anzahl;
              else
                entry[label]  = data[i][j].Anzahl;
            }

            // ensure all labels are present
            //console.log("minage:"+minage+" maxage:"+maxage);
            for (var age = minage; age < maxage; age += step) {
              if (step == 1)
                label     = age+" ("+(thisyear-age)+")";
              else
                label     = age+"-"+(age+step-1)+" ("+(thisyear-age-step)+"-"+(thisyear-age-1)+")";

              //console.log("label:"+label);
              if (!(label in entry))
                entry[label] = 0;
            }
            if (limit_min) {
              label = "< "+limit_min+" (> "+(thisyear-limit_min)+")";
              if (!(label in entry))
                entry[label] = 0;
            }
            if (limit_min) {
              label = "> "+limit_max+" (< "+(thisyear-limit_max)+")";
              if (!(label in entry))
                entry[label] = 0;
            }

            result.push(entry);
          }
          v.data = result;
          return v;
        });
      });
    });
  }),

  memberlookup: Promise.method(function memberlookup(crewname, v) {
    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw err;
      if (!data) throw new Error('Database behaviour inconsistent.');
    }, v);

    var request = new sql.Request(connection);
    v.request.log.debug('MEMBERLOOKUP(DB): checking crewname of',crewname);
    request.input('crewname', sql.VarChar(40), crewname);
    return request.query('SELECT Kurzname,Kennung3,Eintritt,Austritt FROM Adresse WHERE Kurzname = @crewname').then(function(dbresponse) {
      data = dbresponse.recordset;
      if (data.length != 1)
        throw new Error('Not found.');
      v.data = data[0];
      return v;
    });
  }),

  QUERY_CONTRACTLIST_BY_CREWNAME:          {
    statement:  "SELECT MgVert.* FROM Adresse,MgVert WHERE Adresse.Kurzname = @crewname AND MgVert.AdrNr = Adresse.AdrNr",
    params:     { 'crewname': sql.VarChar(40) }
  },
  QUERY_CONTRACT_BY_CREWNAME_AND_CONTRACT: {
    statement:  "SELECT MgVert.* FROM Adresse,MgVert WHERE Adresse.Kurzname = @crewname AND MgVert.AdrNr = Adresse.AdrNr AND (MgVert.VertragNr = @contract OR MgVert.VertragNr = ' '+@contract)",
    params:     {
      'crewname': sql.VarChar(40),
      'contract': sql.VarChar(10)
    }
  },
  QUERY_DEBITLIST_BY_CREWNAME:             {
    statement:  "SELECT MgSolln.* FROM Adresse,MgSolln WHERE Adresse.Kurzname = @crewname AND MgSolln.AdrNr = Adresse.AdrNr ORDER BY MgSolln.Jahr,MgSolln.Zeitraum",
    params:     { 'crewname': sql.VarChar(40) }
  },
  QUERY_DEBIT_BY_CREWNAME_AND_GUID:        {
    statement:  "SELECT MgSolln.* FROM Adresse,MgSolln WHERE Adresse.Kurzname = @crewname AND MgSolln.AdrNr = Adresse.AdrNr AND MgSolln.GUID = @guid",
    params:     {
      'crewname': sql.VarChar(40),
      'guid':     sql.UniqueIdentifier(),
    },
  },
  QUERY_MEMBERLIST:                        {
    statement:  "SELECT AdrNr,Firma4,Nachname,Vorname,Kurzname,Kennung3,Telefon3,Kontaktwoher,Eintritt,Austritt FROM Adresse WHERE Kurzname != '' ORDER BY Nachname",
    params:     {}
  },
  QUERY_STATS_MEMBERS: {
    special:    "QUERY_STATS_MEMBERS"
  },
  QUERY_STATS_CONTRACTS: {
    special:    "QUERY_STATS_CONTRACTS"
  },
  QUERY_STATS_GENDERS: {
    special:    "QUERY_STATS_GENDERS"
  },
  QUERY_STATS_AGES: {
    special:    "QUERY_STATS_AGES"
  },
  QUERY_MEMBERLIST_RAW:                    {
    statement:  "SELECT * FROM Adresse ORDER BY Nachname",
    params:     {}
  },
  QUERY_MEMBER_BY_CREWNAME:                {
    statement:  "SELECT * FROM Adresse WHERE Kurzname = @crewname",
    params:     { 'crewname': sql.VarChar(40) }
  },
  QUERY_MEMBER_MEMO_BY_CREWNAME:        {
    statement:  "SELECT Memof.* FROM Adresse,Memof WHERE Adresse.Kurzname = @crewname AND Memof.AdrNr = Adresse.AdrNr",
    params:     { 'crewname': sql.VarChar(40) }
  },
  QUERY_WITHDRAWALLIST_BY_CREWNAME:        {
    statement:  "SELECT MgLast.* FROM Adresse,MgLast WHERE Adresse.Kurzname = @crewname AND MgLast.Adr_Nummer = Adresse.AdrNr",
    params:     { 'crewname': sql.VarChar(40) }
  },
  QUERY_WITHDRAWAL_BY_CREWNAME_AND_GUID:   {
    statement:  "SELECT MgLast.* FROM Adresse,MgLast WHERE Adresse.Kurzname = @crewname AND MgLast.Adr_Nummer = Adresse.AdrNr AND MgLast.GUID = @guid",
    params:     {
      'crewname': sql.VarChar(40),
      'guid':     sql.UniqueIdentifier(),
    },
  },
  QUERY_PAYMENTLIST_BY_CREWNAME:        {
    statement:  "SELECT F5bew4.* FROM Adresse,F5bew4 WHERE Adresse.Kurzname = @crewname AND F5bew4.AdrNr = Adresse.AdrNr",
    params:     { 'crewname': sql.VarChar(40) }
  }
};
