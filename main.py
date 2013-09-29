#!/usr/bin/env python

"""cteward/st-lexware storage API

provides legacy access to Lexware's data

ENV: CTEWARD_ST_LEXWARE_CONFIG can override config file name
"""

import json
import os
from flask import Flask
from OpenSSL import SSL

import api
from api.database import Database

import sys
if __name__ == '__main__':
  configfile = os.getenv('CTEWARD_ST_LEXWARE_CONFIG', '/etc/cteward/st-lexware.json')
  config = json.load(open(configfile))

  # runner not configured? -> default to 127.0.0.1:14338
  if not 'runner' in config:
    config['runner'] = {
      'port': 14338
    }

  # no flask configuration? no worries.
  if not 'flask' in config:
    config['flask'] = {}

  # no API configuration? provide legacy access config at least
  if not 'api' in config:
    config['api'] = {
      "legacy": {
        "access": {
          "dummy": "dummy"
        }
      }
    }

  # SSL configured? set up context for server
  if not 'ssl' in config:
    sslcontext = None
  else:
    sslcontext = SSL.Context(SSL.SSLv23_METHOD)
    sslcontext.use_certificate_file(config['ssl']['cert'])
    sslcontext.use_privatekey_file(config['ssl']['key'])

  # database configured? initialize it!
  if 'database' in config:
    Database.init(config['database'])

  # set up Flask object, configure it, add API, and go!
  app = Flask('st-lexware')
  app.config.update(**config['flask'])
  api.init(app, config=config['api'])
  app.run(ssl_context=sslcontext, **config['runner'])
