
exports.startup = function () {
  var fs           = require('fs');                 // Filesystem access
  var restify      = require('restify');            // RESTful server
  var bunyan       = require('bunyan');             // Logging
  var Promise      = require('bluebird');

  var database     = require('./database');     // Our database access module
  var filters      = require('./filters');      // Our data filter module
  var mappings     = require('./mappings');     // Our data mapping module
  var renderers    = require('./renderers');    // Our data rendering module
  var authprovider = require('./authprovider'); // Authentication provider data
  var legacy       = require('./legacy');       // Legacy format access
  var member       = require('./member');       // Member access

  var configfile = process.env.CTEWARD_ST_LEXWARE_CONFIG || '/etc/cteward/st-lexware.gson';
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
  server.get('/legacy/memberlist-oldformat', function handle_legacy_memberlist_oldformat(req, res, next) {
    // Parameters:
    //  None
    // Returns CSV:
    //  Nachname;Vorname;Crewname;Status;externe E-Mail;Eintritt;Paten;Weiteres
    // Permissions:
    //  board/bots: can see everything from anyone
    //  members   : can see active members with crewname, status, entry date
    //              can see own information
    //  passive   : can see own information
    //  astronauts: can see own information
    authprovider.find_permission({
      request:     req,
      response:    res,
      permissions: {
        '_board_':     { query: database.QUERY_MEMBERLIST, priority: 0, },
        '_bot_':       { query: database.QUERY_MEMBERLIST, priority: 0, },
        '_member_':    { query: database.QUERY_MEMBERLIST, priority: 1, filter: filters.MEMBERLIST_ACTIVE_ONLY },
        '_passive_':   { query: database.QUERY_MEMBERLIST, priority: 2, filter: filters.MEMBERLIST_SELF_ONLY },
        '_astronaut_': { query: database.QUERY_MEMBERLIST, priority: 3, filter: filters.MEMBERLIST_SELF_ONLY }
      },
    })
    .then(database.runquery)
    .then(filters.runfilter)
    .then(mappings.MEMBERLIST_TO_LDAPCSV)
    .then(renderers.CSV_OUTPUT)
    .then(next)
    .catch(function (e) {
      // FIXME: cleanup / nice message
      return next(e);
    });
  });

  server.get('/legacy/member/:crewname', function handle_legacy_member(req, res, next) {
    // Parameters:
    //  crewname (optional)
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see full record for anyone
    //  members   : can see full record for self
    //  passive   : can see full record for self
    //  astronauts: can see full record for self
    if (req.params.crewname === '') {
      authprovider.find_permission({
          request:     req,
          response:    res,
          permissions: {
            '_board_':     { query: database.QUERY_MEMBERLIST, level: 0 },
            '_bot_':       { query: database.QUERY_MEMBERLIST, level: 0 },
            '_member_':    { query: database.QUERY_MEMBERLIST, level: 1, filter: filters.MEMBERLIST_ACTIVE_ONLY },
            '_passive_':   { query: database.QUERY_MEMBERLIST, level: 2, filter: filters.MEMBERLIST_SELF_ONLY },
            '_astronaut_': { query: database.QUERY_MEMBERLIST, level: 2, filter: filters.MEMBERLIST_SELF_ONLY }
          },
        })
        .then(database.runquery)
        .then(filters.runfilter)
        .then(mappings.MEMBERLIST)
        .then(renderers.JSON_OUTPUT)
        .then(next)
        .catch(function (e) {
          // FIXME: cleanup / nice message
          return next(e);
        });
    } else {
      authprovider.find_permission({
          request:     req,
          response:    res,
          permissions: {
            '_board_':     { query: database.QUERY_MEMBER_BY_CREWNAME },
            '_bot_':       { query: database.QUERY_MEMBER_BY_CREWNAME },
            '_self_':      { query: database.QUERY_MEMBER_BY_CREWNAME },
          },
        })
        .then(database.runquery)
        .then(filters.runfilter)
        .then(mappings.MEMBER)
        .then(renderers.JSON_OUTPUT)
        .then(next)
        .catch(function (e) {
          // FIXME: cleanup / nice message
          return next(e);
        });
    }
  });

  server.get('/legacy/member/:crewname/raw', function handle_legacy_member_raw(req, res, next) {
    // Parameters:
    //  crewname
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see full record for anyone
    if (req.params.crewname === '*') {
      authprovider.find_permission({
          request:     req,
          response:    res,
          permissions: {
            '_board_':     { query: database.QUERY_MEMBERLIST_RAW, level: 0 },
            '_bot_':       { query: database.QUERY_MEMBERLIST_RAW, level: 0 },
          },
        })
        .then(database.runquery)
        .then(filters.runfilter)
        .then(mappings.NONE)
        .then(renderers.JSON_OUTPUT)
        .then(next)
        .catch(function (e) {
          // FIXME: cleanup / nice message
          return next(e);
        });
    } else {
      authprovider.find_permission({
        request:     req,
        response:    res,
        permissions: {
          '_board_':     { query: database.QUERY_MEMBER_BY_CREWNAME },
          '_bot_':       { query: database.QUERY_MEMBER_BY_CREWNAME },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      .then(mappings.NONE)
      .then(renderers.JSON_OUTPUT)
      .then(next)
      .catch(function (e) {
        // FIXME: cleanup / nice message
        return next(e);
      });
    }
  });

  function generic_query(req, res, list_query, list_mapping, id_param, id_query, id_mapping, next) {
    if (req.params.crewname === '')
      return next(new Error('Member details only displayed for individual members.'));
    if (req.params[id_param] === '') {
      authprovider.find_permission({
        request:     req,
        response:    res,
        permissions: {
          '_board_':     { query: list_query },
          '_bot_':       { query: list_query },
          '_self_':      { query: list_query },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      .then(list_mapping)
      .then(renderers.JSON_OUTPUT)
      .then(next)
      .catch(function (e) {
        // FIXME: cleanup / nice message
        return next(e);
      });
    } else {
      authprovider.find_permission({
        request:     req,
        response:    res,
        permissions: {
          '_board_':     { query: id_query },
          '_bot_':       { query: id_query },
          '_self_':      { query: id_query },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      .then(id_mapping)
      .then(renderers.JSON_OUTPUT)
      .then(next)
      .catch(function (e) {
        // FIXME: cleanup / nice message
        return next(e);
      });
    }
  }

  server.get(/^\/legacy\/member\/([^\/]+)\/([^\/]+)\/([^\/]*)\/raw/, function handle_legacy_member_detail_raw(req, res, next) {
    if (req.params[0] === '*')
      return next(new Error('Member details only displayed for individual members.'));
    req.params.crewname = req.params[0];
    switch (req.params[1]) {
      case 'contract':
        var
        list_query   = database.QUERY_CONTRACTLIST_BY_CREWNAME,
        id_param     = 'contract',
        id_query     = database.QUERY_CONTRACT_BY_CREWNAME_AND_CONTRACT;
        break;
      case 'debit':
        var
        list_query   = database.QUERY_DEBITLIST_BY_CREWNAME,
        id_param     = 'guid',
        id_query     = database.QUERY_DEBIT_BY_CREWNAME_AND_GUID;
        break;
      case 'withdrawal':
        var
        list_query   = database.QUERY_WITHDRAWALLIST_BY_CREWNAME,
        id_param     = 'guid',
        id_query     = database.QUERY_WITHDRAWAL_BY_CREWNAME_AND_GUID;
        break;
      default:
        return next(new Error('Invalid member detail requested.'));
    }
    req.params[id_param] = req.params[2];
    if (req.params[id_param] === '') {
      authprovider.find_permission({
         request:     req,
         response:    res,
         permissions: {
          '_board_':     { query: list_query },
          '_bot_':       { query: list_query },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      .then(mappings.NONE)
      .then(renderers.JSON_OUTPUT)
      .then(next)
      .catch(function (e) {
        // FIXME: cleanup / nice message
        return next(e);
      });
    } else {
      authprovider.find_permission({
         request:     req,
         response:    res,
         permissions: {
          '_board_':     { query: id_query },
          '_bot_':       { query: id_query },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      .then(mappings.NONE)
      .then(renderers.JSON_OUTPUT)
      .then(next)
      .catch(function (e) {
        // FIXME: cleanup / nice message
        return next(e);
      });
    }
  });

  server.get('/legacy/member/:crewname/contract/:contract', function handle_legacy_member_contract(req, res, next) {
    // Parameters:
    //  crewname
    //  contract (optional)
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see all contracts for everyone
    //  members   : can see all contracts for self
    //  passive   : can see all contracts for self
    //  astronauts: can see all contracts for self
    generic_query(req, res,
      database.QUERY_CONTRACTLIST_BY_CREWNAME,
      mappings.CONTRACTLIST,
      'contract', 
      database.QUERY_CONTRACT_BY_CREWNAME_AND_CONTRACT,
      mappings.CONTRACT,
      next);
  });
  
  server.get('/legacy/member/:crewname/debit/:guid', function handle_legacy_member_debit(req, res, next) {
    // Parameters:
    //  crewname
    //  debit (optional)
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see all debits for everyone
    //  members   : can see all debits for self
    //  passive   : can see all debits for self
    //  astronauts: can see all debits for self
    generic_query(req, res,
      database.QUERY_DEBITLIST_BY_CREWNAME,
      mappings.DEBITLIST,
      'guid',
      database.QUERY_DEBIT_BY_CREWNAME_AND_GUID,
      mappings.DEBIT,
      next);
  });

  server.get('/legacy/member/:crewname/withdrawal/:guid', function handle_legacy_member_withdrawal(req, res, next) {
    // Parameters:
    //  crewname
    //  withdrawal (optional)
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see all withdrawals for everyone
    //  members   : can see all withdrawals for self
    //  passive   : can see all withdrawals for self
    //  astronauts: can see all withdrawals for self
    generic_query(req, res,
      database.QUERY_WITHDRAWALLIST_BY_CREWNAME,
      mappings.WITHDRAWALLIST,
      'guid',
      database.QUERY_WITHDRAWAL_BY_CREWNAME_AND_GUID,
      mappings.WITHDRAWAL,
      next);
  });

  server.listen(config.server.bind || 14333, function() {
    log.info('%s listening at %s', server.name, server.url);
  });
};