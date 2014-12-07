#!/bin/sh

cd `/usr/bin/dirname $0`
/usr/bin/nodejs app.js | /usr/bin/nodejs node_modules/.bin/bunyan 2>&1

