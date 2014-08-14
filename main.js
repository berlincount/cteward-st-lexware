var fs       = require('fs');             // Filesystem access
var restify  = require('restify');        // RESTful server
var csv      = require('fast-csv');       // CSV generation
var bunyan   = require('bunyan');         // Logging
var database = require('./lib/database'); // Our database access module

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

var log = bunyan.createLogger({
  name: 'cteward-st-lexware',
  level: config.loglevel || 'trace'
});

var server = restify.createServer({
  name: 'cteward-st-lexware',
  version: '0.2.0',
  log: log
});

// create initial connection
database.init(config.mssql);

// handle cURL Connection: keep-alive
server.pre(restify.pre.userAgentConnection());

// status conversion helper functions
function realstatus(rohstatus) {
    return rohstatus;
}

server.get('/legacy/monitor', function legacyMonitor(req, res, next) {
  database.checkBackendOkay(function legacyMonitorBackendAnswer(err, result) {
  if (err) {
    return next(err);
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
  memberlist = database.getMemberList(function memberlist_csv(err, recordset) {
    if (err) {
      return next(err);
    } else {
      csv.writeToStream(res, recordset, {
        headers: true,
        delimiter: ';',
        rowDelimiter: '\n',
        includeEndRowDelimiter: true,
        transform: function transform_row(row) {
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
    }
    return next();
  });
});

server.listen(config.server.bind || 14333, function() {
  console.log('%s listening at %s', server.name, server.url);
});
