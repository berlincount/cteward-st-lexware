
module.exports = function () {
  var fs           = require('fs');                 // Filesystem access
  var restify      = require('restify');            // RESTful server
  var bunyan       = require('bunyan');             // Logging

  var database     = require('./database');     // Our database access module
  var filters      = require('./filters');      // Our data filter module
  var mappings     = require('./mappings');     // Our data mapping module
  var renderers    = require('./renderers');    // Our data rendering module
  var authprovider = require('./authprovider'); // Authentication provider data
  var legacy       = require('./legacy');       // Legacy format access

  var configfile = process.env.CTEWARD_ST_LEXWARE_CONFIG || '/etc/cteward/st-lexware.json';
  var configstr  = '{}';
  try {
    configstr  = fs.readFileSync(configfile,'utf-8');
  } catch(e) {
    console.log("Can't load configfile '" + configfile + "': " +e);
  }
  var config     = JSON.parse(configstr);
  if (!config.mssql)      config.mssql      = {};
  if (!config.server)     config.server     = {};
  if (!config.auth)       config.auth       = {};
  if (!config.auth.bots)  config.auth.bots  = {};
  if (!config.auth.flags) config.auth.flags = {};

  if (!config.logfile)
      logstream = process.stdout;
  else
      logstream = fs.createWriteStream(config.logfile);

  var log = bunyan.createLogger({
    name: 'cteward-st-lexware',
    level: config.loglevel || 'info',
    stream: logstream
  });

  var server = restify.createServer({
    name: 'cteward-st-lexware',
    version: '1.1.0',
    log: log
  });

  // create initial connection
  database.init(config.mssql);

  // handle cURL Connection: keep-alive
  server.pre(restify.pre.userAgentConnection());

  // handle authentication, compression, CORS, etc
  server.use(restify.authorizationParser());
  server.use(restify.gzipResponse());
  server.use(restify.requestLogger());
  server.use(restify.queryParser());
  server.use(restify.CORS());

  // handle logging
  var base64_decode = require('base64').decode;
  server.pre(function (request, response, next) {
     // FIXME: somewhat brontal username extraction exclusively for logging
     username = 'anonymous';
     if (request.headers.authorization) {
         auth = request.headers.authorization.split(' ');
         if (auth[0] == 'Basic')
           username = base64_decode(auth[1]).split(':')[0];
     } else {
         response.setHeader('WWW-Authenticate', 'Basic realm="'+(config.server.realm || 'cteward API access')+'"');
     }

     request.log.info(username, request.method, request.url);
     next();
  });

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
    authprovider.authorize({
      config:      config,
      request:     req,
      response:    res,
      permissions: {
        '_board_':     { query: database.QUERY_MEMBERLIST, level: 0, },
        '_bot_':       { query: database.QUERY_MEMBERLIST, level: 0, },
        '_member_':    { query: database.QUERY_MEMBERLIST, level: 1, filter: filters.MEMBERLIST_ACTIVE_ONLY },
        '_passive_':   { query: database.QUERY_MEMBERLIST, level: 2, filter: filters.MEMBERLIST_SELF_ONLY },
        '_astronaut_': { query: database.QUERY_MEMBERLIST, level: 3, filter: filters.MEMBERLIST_SELF_ONLY }
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

  server.get('/legacy/stats/members', function handle_legacy_stats_members(req, res, next) {
    // Parameters:
    //  None
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  members   : can see full historic data
    authprovider.authorize({
        config:      config,
        request:     req,
        response:    res,
        permissions: {
          '_bot_':       { query: database.QUERY_STATS_MEMBERS, level: 0 },
          '_member_':    { query: database.QUERY_STATS_MEMBERS, level: 0 },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      //.then(function (v) { console.log(v); return v; })
      .then(renderers.JSON_OUTPUT)
      .then(next)
      .catch(function (e) {
        // FIXME: cleanup / nice message
        return next(e);
      });
  });

  server.get('/legacy/stats/contracts', function handle_legacy_stats_contracts(req, res, next) {
    // Parameters:
    //  None
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  members   : can see full historic data
    authprovider.authorize({
        config:      config,
        request:     req,
        response:    res,
        permissions: {
          '_bot_':       { query: database.QUERY_STATS_CONTRACTS, level: 0 },
          '_board_':     { query: database.QUERY_STATS_CONTRACTS, level: 0 },
        },
      })
      .then(database.runquery)
      .then(filters.runfilter)
      //.then(function (v) { console.log(v); return v; })
      .then(renderers.JSON_OUTPUT)
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
    if (req.params.crewname === '' || req.params.crewname === '*') {
      authprovider.authorize({
          config:      config,
          request:     req,
          response:    res,
          permissions: {
            '_board_':     { query: database.QUERY_MEMBERLIST, level: 0 },
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
      authprovider.authorize({
          config:      config,
          request:     req,
          response:    res,
          permissions: {
            '_board_':     { query: database.QUERY_MEMBER_BY_CREWNAME, level: 0 },
            '_self_':      { query: database.QUERY_MEMBER_BY_CREWNAME, level: 0 },
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
    if (req.params.crewname === '' || req.params.crewname === '*') {
      authprovider.authorize({
          config:      config,
          request:     req,
          response:    res,
          permissions: {
            '_board_':     { query: database.QUERY_MEMBERLIST_RAW, level: 0 },
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
      authprovider.authorize({
        config:      config,
        request:     req,
        response:    res,
        permissions: {
          '_board_':     { query: database.QUERY_MEMBER_BY_CREWNAME, level: 0 },
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

  server.get('/legacy/member/:crewname/memo', function handle_legacy_member_memo(req, res, next) {
    // Parameters:
    //  crewname
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see full record for anyone
    if (req.params.crewname === '')
      return next(new Error('Member details only displayed for individual members.'));
    authprovider.authorize({
      config:      config,
      request:     req,
      response:    res,
      permissions: {
        '_board_':     { query: database.QUERY_MEMBER_MEMO_BY_CREWNAME, level: 0 },
      },
    })
    .then(database.runquery)
    .then(filters.runfilter)
    .then(mappings.MEMO)
    .then(renderers.JSON_OUTPUT)
    .then(next)
    .catch(function (e) {
      // FIXME: cleanup / nice message
      return next(e);
    });
  });

  server.get('/legacy/member/:crewname/contributions', function handle_legacy_member_contributions(req, res, next) {
    // Parameters:
    //  crewname
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see full record for anyone
    if (req.params.crewname === '')
      return next(new Error('Member details only displayed for individual members.'));
    authprovider.authorize({
      config:      config,
      request:     req,
      response:    res,
      permissions: {
        '_board_':     { query: database.QUERY_DEBITLIST_BY_CREWNAME, level: 0 },
      },
    })
    .then(database.runquery)
    .then(filters.runfilter)
    .then(mappings.CONTRIBUTIONS)
    .then(renderers.JSON_OUTPUT)
    .then(next)
    .catch(function (e) {
      // FIXME: cleanup / nice message
      return next(e);
    });
  });

  function generic_query(req, res, list_query, list_mapping, id_param, id_query, id_mapping, next) {
    if (req.params.crewname === '' || req.params.crewname === '*')
      return next(new Error('Member details only displayed for individual members.'));
    if (!id_param || req.params[id_param] === '') {
      authprovider.authorize({
        config:      config,
        request:     req,
        response:    res,
        permissions: {
          '_board_':     { query: list_query, level: 0 },
          '_self_':      { query: list_query, level: 0 },
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
      authprovider.authorize({
        config:      config,
        request:     req,
        response:    res,
        permissions: {
          '_board_':     { query: id_query, level: 0 },
          '_self_':      { query: id_query, level: 0 },
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
    var list_query, id_param, id_query;
    switch (req.params[1]) {
      case 'contract':
        list_query   = database.QUERY_CONTRACTLIST_BY_CREWNAME;
        id_param     = 'contract';
        id_query     = database.QUERY_CONTRACT_BY_CREWNAME_AND_CONTRACT;
        break;
      case 'debit':
        list_query   = database.QUERY_DEBITLIST_BY_CREWNAME;
        id_param     = 'guid';
        id_query     = database.QUERY_DEBIT_BY_CREWNAME_AND_GUID;
        break;
      case 'withdrawal':
        list_query   = database.QUERY_WITHDRAWALLIST_BY_CREWNAME;
        id_param     = 'guid';
        id_query     = database.QUERY_WITHDRAWAL_BY_CREWNAME_AND_GUID;
        break;
      case 'payment':
        list_query   = database.QUERY_PAYMENTLIST_BY_CREWNAME;
        id_param     = undefined;
        id_query     = database.QUERY_PAYMENT_BY_CREWNAME_AND_GUID;
        break;
      default:
        return next(new Error('Invalid member detail requested.'));
    }
    if (id_param)
        req.params[id_param] = req.params[2];
    if (!id_param || req.params[id_param] === '' || req.params[id_param] === '*') {
      authprovider.authorize({
         config:      config,
         request:     req,
         response:    res,
         permissions: {
          '_board_':     { query: list_query, level: 0 },
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
      authprovider.authorize({
         config:      config,
         request:     req,
         response:    res,
         permissions: {
          '_board_':     { query: id_query, level: 0 },
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

  server.get('/legacy/member/:crewname/payment/:guid', function handle_legacy_member_payment(req, res, next) {
    // Parameters:
    //  crewname
    //  payment (optional)
    // Returns JSON:
    //  FIXME: example
    // Permissions:
    //  board/bots: can see all payments for everyone
    //  members   : can see all payments for self
    //  passive   : can see all payments for self
    //  astronauts: can see all payments for self
    generic_query(req, res,
      database.QUERY_PAYMENTLIST_BY_CREWNAME,
      mappings.PAYMENTLIST,
      undefined,
      database.QUERY_PAYMENT_BY_CREWNAME_AND_GUID,
      mappings.PAYMENT,
      next);
  });

  server.listen(config.server.bind || 14333, function() {
    log.info('%s listening at %s', server.name, server.url);
  });

  // autogenerate base URL, if possible
  if (!config.base)  config.base = server.url;
};
