var restify = require('restify');
var sql     = require('mssql');
var csv     = require('fast-csv');
var bunyan  = require('bunyan');

function realstatus(rohstatus) {
    return rohstatus;
}

function backendOkay(next) {
    var numMembers;
    var numDuplicates;
    var request = new sql.Request();
    request.query('SELECT COUNT(*) AS MemberCount FROM Adresse', function(err, recordset) {
        console.log(err);
        if (err) next(new Error('Database access failed (#1).'));
        if (recordset[0].MemberCount < 7) next(new Error('Too few members.'));
    });
    request.query('SELECT Kurzname AS Crewname,COUNT(*) FROM Adresse GROUP BY Kurzname HAVING COUNT(*) > 1', function(err, recordset) {
        console.log(err);
        if (err) next(new Error('Database access failed (#2).'));
        if (recordset.length > 0) next(new Error('Duplicate membernames.'));
    });
    next(true);
}

var log = bunyan.createLogger({
    name: 'cteward-st-lexware',
    level: 'trace'
});

var connection = new sql.Connection({
    user: 'readonly',
    password: 'XXXXXXXXXXXXXXXX',
    server: 'localhost',
    database: 'Linear'
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
            next(result);
        } else if (result)
            res.send({'status': 'OK'});
        else
            res.send({'status': 'BROKEN'});
        next();
    });
});

server.get('/legacy/memberlist', function memberlist(req, res, next) {
    // TODO: memberlist answer
    console.log("TODO: memberlist answer");
    next(Error("TODO: memberlist answer"));
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
        next();
    });
});

server.listen(14333, function() {
  console.log('%s listening at %s', server.name, server.url);
});
