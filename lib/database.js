var Promise = require('bluebird');
var sql     = require('mssql');    // Microsoft SQL access

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

    connection = new sql.Connection({
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

  connected: function() {
    if (is_connected)
      return true;

    // just retry
    if (connection && !connection.connecting)
      connection.connect(tryconnect);
    return false;
  },

  checkBackendOkay: function checkBackendOkay(callback) {
    if (!callback)
      throw new Error('callback missing for checkBackendOkay');

    if (!module.exports.connected()) {
      throw new Error("Database connection failed.");
    }

    var request = new sql.Request(connection);
    request.query('SELECT COUNT(*) AS MemberCount FROM Adresse', function(err, recordset) {
      if (err) throw new Error('Database access failed (#1).');
      if (recordset[0].MemberCount < 7) throw new Error('Too few members.');
    });
    request.query('SELECT Kurzname AS Crewname,COUNT(*) FROM Adresse GROUP BY Kurzname HAVING COUNT(*) > 1', function(err, recordset) {
      if (err) throw new Error('Database access failed (#2).');
      if (recordset.length > 0) throw new Error('Duplicate membernames.');
    });
    return callback(null, true);
  },

  runquery: Promise.method(function runquery(v) {
    if (!v.query)
      throw new Error('query missing for query');
    if (v.query.special)
      switch (v.query.special) {
        case module.exports.QUERY_STATS_MEMBERS.special:
          return module.exports.runquery_stats_members(v);
        case module.exports.QUERY_STATS_CONTRACTS.special:
          return module.exports.runquery_stats_contracts(v);
      }
    if (!v.query.statement)
      throw new Error('statement missing for query');
    if (!v.query.params)
      throw new Error('params missing for query');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw new Error('Database behaviour inconsistent.');
    });

    var request = new sql.Request(connection);
    Promise.promisifyAll(Object.getPrototypeOf(request));
    // check whether all parameters were given
    for (var key in v.query.params)
      if (!v.request.params.hasOwnProperty(key))
        throw new Error('not all params given for query');
      else
        request.input(key, v.query.params[key], v.request.params[key]);

    return request.queryAsync(v.query.statement).then(function(data) {
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
    });

    var request = new sql.Request(connection);
    Promise.promisifyAll(Object.getPrototypeOf(request));

    return request.queryAsync("SELECT MIN(Eintritt) AS EintrittMin,MAX(Eintritt) AS EintrittMax,MIN(Austritt) AS AustrittMin,MAX(Austritt) AS AustrittMax FROM Adresse").then(function(data) {
      var mindate = Date.now();
      var maxdate = Date.now();
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
      Promise.promisifyAll(Object.getPrototypeOf(ps));
      ps.input('yearstr',sql.VarChar);
      ps.input('monthstr',sql.VarChar);
      return ps.prepareAsync("SELECT CAST(@yearstr AS INT) AS Year,CAST(@monthstr AS INT) AS Month,COUNT(Kurzname) AS Members FROM Adresse WHERE Eintritt<CAST(@monthstr+'/28/'+@yearstr AS DATETIME) AND (Austritt IS NULL OR Austritt='' OR Austritt>CAST(@monthstr+'/28/'+@yearstr AS DATETIME))").then(function () {
        for (; year <= v.maxdate.getFullYear(); year++) {
          for (; (year < v.maxdate.getFullYear() && month <= 12)||(month <= v.maxdate.getMonth()+1); month++) {
            queries.push(ps.executeAsync({yearstr: year, monthstr: month}));
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
    });

    var request = new sql.Request(connection);
    Promise.promisifyAll(Object.getPrototypeOf(request));

    return request.queryAsync("SELECT MIN(VertragBegin) AS VertragBeginMin,MAX(VertragBegin) AS VertragBeginMax,MIN(VertragEnde) AS VertragEndeMin,MAX(VertragEnde) AS VertragEndeMax FROM MgVert").then(function(data) {
      var mindate = Date.now();
      var maxdate = Date.now();
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
      Promise.promisifyAll(Object.getPrototypeOf(ps));
      ps.input('yearstr',sql.VarChar);
      ps.input('monthstr',sql.VarChar);
      return ps.prepareAsync("SELECT CAST(@yearstr AS INT) AS Year,CAST(@monthstr AS INT) AS Month,COUNT(ArtName) AS Contracts,ArtName AS ContractName FROM MgVert WHERE VertragBegin<CAST(@monthstr+'/28/'+@yearstr AS DATETIME) AND (VertragEnde IS NULL OR VertragEnde='' OR VertragEnde>CAST(@monthstr+'/28/'+@yearstr AS DATETIME)) GROUP BY ArtName").then(function () {
        for (; year <= v.maxdate.getFullYear(); year++) {
          for (; (year < v.maxdate.getFullYear() && month <= 12)||(month <= v.maxdate.getMonth()+1); month++) {
            queries.push(ps.executeAsync({yearstr: year, monthstr: month}));
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

  memberlookup: Promise.method(function memberlookup(crewname) {
    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw err;
      if (!data) throw new Error('Database behaviour inconsistent.');
    });

    var request = new sql.Request(connection);
    Promise.promisifyAll(Object.getPrototypeOf(request));
    request.input('crewname', sql.VarChar(40), crewname);
    return request.queryAsync('SELECT Kurzname,Kennung3,Eintritt,Austritt FROM Adresse WHERE Kurzname = @crewname').then(function(data) {
      if (data.length != 1)
        throw new Error('Not found.');
      return data[0];
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
