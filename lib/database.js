
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

function init(config) {
  if (!config)
    config = {};

  connection = new sql.Connection({
    user:     config.user     || 'readonly',
    password: config.password || 'XXXXXXXXXXXXXXXX',
    server:   config.server   || 'localhost',
    database: config.database || 'Linear'
  });
  connection.connect(tryconnect);
}

function connected() {
  if (is_connected)
    return true;

  // just retry
  if (connection && !connection.connecting)
      connection.connect(tryconnect);
  return false;
}

function checkBackendOkay(callback) {
    var numMembers;
    var numDuplicates;

    if (!callback)
      throw new Error('callback missing for checkBackendOkay');

    if (!connected())
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
}


function getMemberList(callback) {
    if (!callback)
      throw new Error('callback missing for getMemberList');

    if (!connected())
      return callback(connecterr, null);

    var request = new sql.Request(connection);
    result = request.query('SELECT AdrNr,Firma4 AS Firma,Nachname,Vorname,Kurzname AS Crewname,Kennung3 AS Rohstatus,Telefon3 AS Ext_Mail,Kontaktwoher AS Paten,CONVERT(VARCHAR(8),Eintritt,112) AS Eintritt,CONVERT(VARCHAR(8),Austritt,112) AS Austritt FROM Adresse ORDER BY Nachname', callback);
}

module.exports = {
  init: init,
  connected: connected,
  checkBackendOkay: checkBackendOkay,
  getMemberList: getMemberList
};
