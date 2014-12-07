sinon = require('sinon');
sql = require('mssql');

// simulate SQL server
sqlrequest = sinon.stub(sql, 'Request');
sqlrequest_query = sinon.stub();
//sqlrequest_query = function(foo,bar) { console.log(foo); console.log(bar); }
sqlrequest_query.withArgs('SELECT COUNT(*) AS MemberCount FROM Adresse').callsArgWith(1, false, [{MemberCount: 7}]);
sqlrequest_query.withArgs('SELECT Kurzname AS Crewname,COUNT(*) FROM Adresse GROUP BY Kurzname HAVING COUNT(*) > 1').callsArgWith(1, false, []);
sqlrequest.prototype.query = sqlrequest_query;

// init the test client
var client = restify.createJsonClient({
    version: '*',
    url: 'http://127.0.0.1:14334'
});

describe('service: /legacy/monitor', function() {
    // Test #1
    describe('200 Okay test', function() {
        it('should get a 200 response', function(done) {
            client.get('/legacy/monitor', function(err, req, res, data) {
                if (err) {
                    throw new Error(err);
                }
                else {
                    if (res.statusCode != 200) {
                        console.log(res);
                        throw new Error('invalid response from /legacy/monitor');
                    } else if (data.status != 'OK') {
                        throw new Error('non-OK response from /legacy/monitor');
                    }
                    done();
                }
            });
        });
    });
    // Add more tests as needed...
});
