#!/bin/sh

cd `/usr/bin/dirname $0`
export CTEWARD_ST_LEXWARE_CONFIG=st-lexware-dev.json
/usr/local/bin/nodemon -x nodejs app.js | /usr/bin/nodejs node_modules/.bin/bunyan 2>&1

