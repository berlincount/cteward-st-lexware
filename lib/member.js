

var restify      = require('restify');      // RESTful server
var database     = require('./database');   // database connectivity
var memberdata   = require('./memberdata'); // Our memberdata conversion module
var csv          = require('fast-csv');     // CSV generation

module.exports = {
  get: function member_get(req, res, next) {
    if (req.params.id === '') {
      database.getMemberList(function memberlist_reformat(err, recordset) {
        if (err) {
          return next(err);
        } else {
          var formattedlist = {};
          recordset.forEach(function memberlist_entry(entry){
            if (entry.Crewname.indexOf('X', entry.Crewname.length-1) === -1) {
              formattedlist[entry.Crewname] = {
                'status'  : memberdata.realstatus(entry),
                'eintritt': memberdata.datum(entry.Eintritt),
                'paten'   : memberdata.patenarray(entry.Paten),
              };
            }
          });
          res.end(JSON.stringify(formattedlist, null, 2));
          return next();
        }
      });
    } else {
      database.getMember(req.params.id, function member_reformat(err, recordset) {
        if (err) {
          return next(err);
        } else if (recordset.length != 1) {
          return next(new Error('Nothing or too much found.'));
        } else {
          var member = recordset[0];
          /* massage data */
          member.Status   = memberdata.realstatus(member);
          member.Eintritt = memberdata.datum(member.Eintritt);
          member.Paten    = memberdata.patenarray(member.Paten);
          res.end(JSON.stringify(member, null, 2));
          return next();
        }
      });
    }
  },

  getRaw: function member_get_raw(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member raw data only provided for individual members.'));
    } else {
      database.getMemberRaw(req.params.id, function member_return_reformatted(err, recordset) {
        if (err) {
          return next(err);
        } else if (recordset.length != 1) {
          return next(new Error('Nothing or too much found.'));
        } else {
          res.end(JSON.stringify(recordset[0], null, 2));
          return next();
        }
      });
    }
  },

  getContract: function member_get_contract(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member contract data only provided for individual members.'));
    } else {
      database.getMemberContract(req.params.id, req.params.contract, function member_return_contract(err, recordset) {
        if (err) {
          return next(err);
        } else {
          res.end(JSON.stringify(recordset, null, 2));
          return next();
        }
      });
    }
  },

  getDebit: function member_get_debit(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member debit data only provided for individual members.'));
    } else {
      database.getMemberDebit(req.params.id, req.params.debit, function member_return_debit(err, recordset) {
        if (err) {
          return next(err);
        } else {
          res.end(JSON.stringify(recordset, null, 2));
          return next();
        }
      });
    }
  },

  getWithdrawal: function member_get_withdrawal(req, res, next) {
    if (req.params.id === '') {
      return next(new Error('Member withdrawal data only provided for individual members.'));
    } else {
      database.getMemberWithdrawal(req.params.id, req.params.withdrawal, function member_return_withdrawal(err, recordset) {
        if (err) {
          return next(err);
        } else {
          res.end(JSON.stringify(recordset, null, 2));
          return next();
        }
      });
    }
  }
};
