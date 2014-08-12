var fs      = require('fs')        // Filesystem access
var restify = require('restify');  // RESTful server
var sql     = require('mssql');    // Microsoft SQL access
var csv     = require('fast-csv'); // CSV generation
var bunyan  = require('bunyan');   // Logging

var configfile = process.env.CTEWARD_ST_LEXWARE_CONFIG || '/etc/cteward/st-lexware.json';
var configstr  = '{ "mssql": {}, "server": {} }';
try {
  configstr  = fs.readFileSync(configfile,'utf-8');
} catch(e) {
  console.log("Can't load configfile '" + configfile + "': " +e);
}
var config     = JSON.parse(configstr);
if (!config.mssql)  config.mssql  = {};
if (!config.server) config.server = {};

function realstatus(rohstatus) {
    return rohstatus;
}

function backendOkay(next) {
    var numMembers;
    var numDuplicates;
    var request = new sql.Request();
    result = request.query('SELECT COUNT(*) AS MemberCount FROM Adresse', function(err, recordset) {
        console.log("X1");
        console.log(err);
        console.log("X2");
        if (err) return next(new Error('Database access failed (#1).'));
        if (recordset[0].MemberCount < 7) return next(new Error('Too few members.'));
        return 1;
    });
    console.log("Z1");
    console.log(result);
    console.log("Z2");
    request.query('SELECT Kurzname AS Crewname,COUNT(*) FROM Adresse GROUP BY Kurzname HAVING COUNT(*) > 1', function(err, recordset) {
        console.log("Y1");
        console.log(err);
        console.log("Y2");
        if (err) return next(new Error('Database access failed (#2).'));
        if (recordset.length > 0) return next(new Error('Duplicate membernames.'));
        return 1;
    });
    console.log("G1");
    console.log(result);
    console.log("G2");
    return next(true);
}

var log = bunyan.createLogger({
    name: 'cteward-st-lexware',
    level: config.loglevel || 'trace'
});

var connection = new sql.Connection({
    user:     config.mssql.user     || 'readonly',
    password: config.mssql.password || 'XXXXXXXXXXXXXXXX',
    server:   config.mssql.server   || 'localhost',
    database: config.mssql.database || 'Linear'
});

var server = restify.createServer({
    name: 'cteward-st-lexware',
    version: '0.2.0',
    log: log
});

connection.connect(function backendConnect(err) {
    if (err) throw(err);
});

// handle cURL Connection: keep-alive
server.pre(restify.pre.userAgentConnection());

server.get('/legacy/monitor', function legacyMonitor(req, res, next) {
    backendOkay(function legacyMonitorBackendAnswer(result) {
        if (result instanceof Error) {
            return next(result);
        } else if (result)
            res.send({'status': 'OK'});
        else
            res.send({'status': 'BROKEN'});
        return next();
    });
});

server.get('/legacy/memberlist', function memberlist(req, res, next) {
    // TODO: memberlist answer
    console.log("TODO: memberlist answer");
    return next(Error("TODO: memberlist answer"));
});
server.get('/legacy/memberlist-oldformat', function memberlist_oldformat(req, res, next) {
    var request = new sql.Request();
    request.query('SELECT AdrNr,Firma4 AS Firma,Nachname,Vorname,Kurzname AS Crewname,Kennung3 AS Rohstatus,Telefon3 AS Ext_Mail,Kontaktwoher AS Paten,CONVERT(VARCHAR(8),Eintritt,112) AS Eintritt,CONVERT(VARCHAR(8),Austritt,112) AS Austritt FROM Adresse ORDER BY Nachname', function memberlist_csv(err, recordset) {
        // TODO: error handling
        csv.writeToStream(res, recordset, {
            headers: true,
            delimiter: ';',
            transform: function(row) {
                // IN:  AdrNr;Firma;Nachname;Vorname;Crewname;Rohstatus;Ext_Mail;Paten;Eintritt;Austritt
                // OUT: Nachname;Vorname;Crewname;Status;externe E-Mail;Eintritt;Paten;Weiteres
                return {
                    'Nachname':       row.Nachname,
                    'Vorname':        row.Vorname,
                    'Crewname':       row.Crewname,
                    'Status':         realstatus(row.Rohstatus),
                    'externe E-Mail': row.Ext_Mail,
                    'Eintritt':       row.Eintritt,
                    'Paten':          row.Paten,
                    'Weiteres':       ''
                };
            }
        });
        return next();
    });
});

server.listen(config.server.bind || 14333, function() {
  console.log('%s listening at %s', server.name, server.url);
});
