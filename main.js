var fs           = require('fs');                 // Filesystem access
var restify      = require('restify');            // RESTful server
var bunyan       = require('bunyan');             // Logging
var database     = require('./lib/database');     // Our database access module
var authprovider = require('./lib/authprovider'); // Authentication provider data
var legacy       = require('./lib/legacy');       // Legacy format access
var member       = require('./lib/member');       // Member access

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
  level: config.loglevel || 'info'
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

// handle authentication, compression, logging & CORS
server.use(restify.authorizationParser());
server.use(restify.gzipResponse());
server.use(restify.requestLogger());
server.use(restify.CORS());

server.get('/legacy/monitor',              legacy.monitor);
server.get('/legacy/memberlist-oldformat', function auth_memberlist_oldformat(req, res, next) {
  // FIXME: this will become asynchronouse in the long (OAuth2) run
  if (req.authorization.scheme === undefined) {
    return next(new restify.errors.UnauthorizedError("Permission denied."));
  }
  if (!authprovider.permitted(config, req, 'memberlist')) {
    return next(new restify.errors.NotAuthorizedError("Permission denied."));
  }
  legacy.memberlist_oldformat(req, res, next);
});

server.get('/legacy/member/:id', function auth_member(req, res, next) {
  // FIXME: this will become asynchronouse in the long (OAuth2) run
  if (req.authorization.scheme === undefined) {
    return next(new restify.errors.UnauthorizedError("Permission denied."));
  }
  if (!authprovider.permitted(config, req, 'member', req.params.id)) {
    return next(new restify.errors.NotAuthorizedError("Permission denied."));
  }
  member.get(req, res, next);
});

server.get('/legacy/member/:id/raw', function auth_member(req, res, next) {
  // FIXME: this will become asynchronouse in the long (OAuth2) run
  if (req.authorization.scheme === undefined) {
    return next(new restify.errors.UnauthorizedError("Permission denied."));
  }
  if (!authprovider.permitted(config, req, 'member-raw', req.params.id)) {
    return next(new restify.errors.NotAuthorizedError("Permission denied."));
  }
  member.getRaw(req, res, next);
});

server.get('/legacy/member/:id/contract/:contract/raw', function auth_member(req, res, next) {
  // FIXME: this will become asynchronouse in the long (OAuth2) run
  if (req.authorization.scheme === undefined) {
    return next(new restify.errors.UnauthorizedError("Permission denied."));
  }
  if (!authprovider.permitted(config, req, 'member-contract', req.params.id)) {
    return next(new restify.errors.NotAuthorizedError("Permission denied."));
  }
  member.getContract(req, res, next);
});

server.get('/legacy/member/:id/debit/:debit/raw', function auth_member(req, res, next) {
  // FIXME: this will become asynchronouse in the long (OAuth2) run
  if (req.authorization.scheme === undefined) {
    return next(new restify.errors.UnauthorizedError("Permission denied."));
  }
  if (!authprovider.permitted(config, req, 'member-debit', req.params.id)) {
    return next(new restify.errors.NotAuthorizedError("Permission denied."));
  }
  member.getDebit(req, res, next);
});

server.get('/legacy/member/:id/withdrawal/:withdrawal/raw', function auth_member(req, res, next) {
  // FIXME: this will become asynchronouse in the long (OAuth2) run
  if (req.authorization.scheme === undefined) {
    return next(new restify.errors.UnauthorizedError("Permission denied."));
  }
  if (!authprovider.permitted(config, req, 'member-withdrawal', req.params.id)) {
    return next(new restify.errors.NotAuthorizedError("Permission denied."));
  }
  member.getWithdrawal(req, res, next);
});

server.listen(config.server.bind || 14333, function() {
  console.log('%s listening at %s', server.name, server.url);
});
