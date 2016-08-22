var database     = require('./database');   // database connectivity

module.exports = {
    // check the status of the backend database
    monitor: function legacyMonitor(req, res, next) {
        database.checkBackendOkay(function legacyMonitorBackendAnswer(err, result) {
            if (err) {
                return next(err);
            } else if (result) {
                res.json(200,{'status': 'OK'});
            } else {
                res.json(503,{'status': 'BROKEN'});
            }
            return next();
        }, {request: req});
    }
};
