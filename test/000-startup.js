var sinon = require('sinon');
var os = require('os');

// logfile simulation
var fs = require('fs');

var MemoryStream = require('memorystream');
var memstream = new MemoryStream();
memstream_data = [];
memstream.on('data', function(chunk) {
  var message = chunk.toString();
  var messagedata = JSON.parse(message);
  // console.log(messagedata);
  // { name: 'cteward-st-lexware',
  //   hostname: 'foobar',
  //   pid: 12345,
  //   level: 30,
  //   msg: 'cteward-st-lexware listening at http://0.0.0.0:14334',
  //   time: '2014-12-13T01:07:36.332Z',
  //   v: 0 }
  if (messagedata.name !== 'cteward-st-lexware')
      throw new Error('logging: name is different than expected was logged: '+messagedata.name);
  if (messagedata.pid  !== process.pid)
      throw new Error('logging: wrong process ID was logged: '+messagedata.pid);
  if (messagedata.hostname !== os.hostname())
      throw new Error('logging: wrong hostname was logged: '+messagedata.hostname);
  var then = new Date(messagedata.time);
  var now  = new Date();
  if (now - then > 30000 || now - then < 0)
      throw new Error('logging: time of logging seems too far away from now: '+then+' vs '+now);

  if (messagedata.msg !== 'cteward-st-lexware listening at http://:::14334')
      memstream_data.push(messagedata.msg);
});
var filestub = sinon.stub(fs, 'createWriteStream');
filestub.withArgs('testlogfile').returns(memstream);

before(function(done) {
  process.env.CTEWARD_ST_LEXWARE_CONFIG = 'st-lexware-test.json';

  memstream_data = [];
  require('../lib/startup')();
  done();
});

after(function(done) {
  if (memstream_data.length !== 0) {
    console.log('unchecked logfile data:');
    console.log(memstream_data);
    throw new Error('unchecked logfile data ('+memstream_data.length+' lines)');
  }
  done();
});

