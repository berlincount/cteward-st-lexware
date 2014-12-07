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
        min: 0,
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
    var numMembers;
    var numDuplicates;

    if (!callback)
      throw new Error('callback missing for checkBackendOkay');

    if (!module.exports.connected())
      return callback(connecterr, null);

    var request = new sql.Request(connection);
    result = request.query('SELECT COUNT(*) AS MemberCount FROM Adresse', function(err, recordset) {
      if (err) return callback(new Error('Database access failed (#1).'), null);
      if (recordset[0].MemberCount < 7) return callback(new Error('Too few members.'), null);
    });
    request.query('SELECT Kurzname AS Crewname,COUNT(*) FROM Adresse GROUP BY Kurzname HAVING COUNT(*) > 1', function(err, recordset) {
      if (err) return callback(new Error('Database access failed (#2).'), null);
      if (recordset.length > 0) return callback(new Error('Duplicate membernames.'), null);
    });
    return callback(null, true);
  },
/*
  getMemberList: function getMemberList(callback) {
    if (!callback)
      throw new Error('callback missing for getMemberList');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) return callback(err, null);
      if (!data) return callback(new Error('Database behaviour inconsistent.'));
    });

    var request = new sql.Request(connection);
    result = request.query("SELECT AdrNr,Firma4 AS Firma,Nachname,Vorname,Kurzname AS Crewname,Kennung3 AS Rohstatus,Telefon3 AS Ext_Mail,Kontaktwoher AS Paten,CONVERT(VARCHAR(8),Eintritt,112) AS Eintritt,CONVERT(VARCHAR(8),Austritt,112) AS Austritt FROM Adresse WHERE Kurzname != '' ORDER BY Nachname", callback);
  },

  getMember: function getMember(crewname, callback) {
    if (!callback)
      throw new Error('callback missing for getMember');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) return callback(err, null);
      if (!data) return callback(new Error('Database behaviour inconsistent.'));
    });

    var request = new sql.Request(connection);
    request.input('crewname', sql.VarChar(40), crewname);
    result = request.query("SELECT AdrNr,Firma4 AS Firma,Nachname,Vorname,Kurzname AS Crewname,Kennung3 AS Rohstatus,Telefon3 AS Ext_Mail,Kontaktwoher AS Paten,CONVERT(VARCHAR(8),Eintritt,112) AS Eintritt,CONVERT(VARCHAR(8),Austritt,112) AS Austritt FROM Adresse WHERE Kurzname = @crewname", callback);
  },

  getMemberRaw: function getMemberRaw(crewname, callback) {
    if (!callback)
      throw new Error('callback missing for getMemberRaw');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) return callback(err, null);
      if (!data) return callback(new Error('Database behaviour inconsistent.'));
    });

    var request = new sql.Request(connection);
    request.input('crewname', sql.VarChar(40), crewname);
    result = request.query("SELECT * FROM Adresse WHERE Kurzname = @crewname", callback);
  },

  getMemberContract: function getMemberContract(crewname, contract, callback) {
    if (!callback)
      throw new Error('callback missing for getMemberContract');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) return callback(err, null);
      if (!data) return callback(new Error('Database behaviour inconsistent.'));
    });

    var request = new sql.Request(connection);
    if (contract === '') {
      request.input('crewname', sql.VarChar(40), crewname);
      result = request.query("SELECT MgVert.* FROM Adresse,MgVert WHERE Adresse.Kurzname = @crewname AND MgVert.AdrNr = Adresse.AdrNr", callback);
    } else {
      request.input('crewname', sql.VarChar(40), crewname);
      request.input('contract', sql.VarChar(10), contract);
      result = request.query("SELECT MgVert.* FROM Adresse,MgVert WHERE Adresse.Kurzname = @crewname AND MgVert.AdrNr = Adresse.AdrNr AND MgVert.VertragNr = @contract", callback);
    }
  },

  getMemberDebit: function getMemberDebit(crewname, debit, callback) {
    if (!callback)
      throw new Error('callback missing for getMemberDebit');
    module.exports.checkBackendOkay(function (err, data) {
      if (err) return callback(err, null);
      if (!data) return callback(new Error('Database behaviour inconsistent.'));
    });

    var request = new sql.Request(connection);
    if (debit === '') {
      request.input('crewname', sql.VarChar(40), crewname);
      result = request.query("SELECT MgSolln.* FROM Adresse,MgSolln WHERE Adresse.Kurzname = @crewname AND MgSolln.AdrNr = Adresse.AdrNr", callback);
    } else {
      request.input('crewname', sql.VarChar(40), crewname);
      request.input('debit', sql. UniqueIdentifier(), debit);
      result = request.query("SELECT MgSolln.* FROM Adresse,MgSolln WHERE Adresse.Kurzname = @crewname AND MgSolln.AdrNr = Adresse.AdrNr AND MgSolln.GUID = @debit", callback);
    }
  },

  getMemberWithdrawal: function getMemberWithdrawal(crewname, withdrawal, callback) {
    if (!callback)
      throw new Error('callback missing for getMemberWithdrawal');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) return callback(err, null);
      if (!data) return callback(new Error('Database behaviour inconsistent.'));
    });

    var request = new sql.Request(connection);
    if (withdrawal === '') {
      request.input('crewname', sql.VarChar(40), crewname);
      result = request.query("SELECT MgLast.* FROM Adresse,MgLast WHERE Adresse.Kurzname = @crewname AND MgLast.Adr_Nummer = Adresse.AdrNr", callback);
    } else {
      request.input('crewname', sql.VarChar(40), crewname);
      request.input('withdrawal', sql. UniqueIdentifier(), withdrawal);
      result = request.query("SELECT MgLast.* FROM Adresse,MgLast WHERE Adresse.Kurzname = @crewname AND MgLast.Adr_Nummer = Adresse.AdrNr AND MgLast.GUID = @withdrawal", callback);
    }
  },
*/
  runquery: Promise.method(function runquery(v) {
    if (!v.query)
      throw new Error('query missing for query');
    if (!v.query.statement)
      throw new Error('statement missing for query');
    if (!v.query.params)
      throw new Error('params missing for query');

    module.exports.checkBackendOkay(function (err, data) {
      if (err) throw(err);
      if (!data) throw(new Error('Database behaviour inconsistent.'));
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
    statement:  "SELECT MgSolln.* FROM Adresse,MgSolln WHERE Adresse.Kurzname = @crewname AND MgSolln.AdrNr = Adresse.AdrNr",
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
  QUERY_MEMBERLIST_RAW:                    {
    statement:  "SELECT * FROM Adresse ORDER BY Nachname",
    params:     {}
  },
  QUERY_MEMBER_BY_CREWNAME:                {
    statement:  "SELECT * FROM Adresse WHERE Kurzname = @crewname",
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
};