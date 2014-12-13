

var database     = require('./database');   // database connectivity

module.exports = {
  monitor: function legacyMonitor(req, res, next) {
    database.checkBackendOkay(function legacyMonitorBackendAnswer(err, result) {
    if (err) {
      return next(err);
    } else if (result) {
      res.status(200);
      res.send({'status': 'OK'});
    } else {
      res.status(503);
      res.send({'status': 'BROKEN'});
    }
    return next();
    });
  },
};
