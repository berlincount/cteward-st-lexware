#!/usr/bin/env python

"""cteward/st-lexware storage API

provides legacy access to Lexware's data

ENV: CTEWARD_ST_LEXWARE_CONFIG can override config file name
"""

import json
import os
from flask import Flask
from OpenSSL import SSL
from flask.ext.ldap import LDAP

import api
from api.database import Database

import sys

config = {}
sslcontext = None
app = None
ldap = None

def load_config():
  global config
  configfile = os.getenv('CTEWARD_ST_LEXWARE_CONFIG', '/etc/cteward/st-lexware.json')
  config = json.load(open(configfile))

def check_config():
  global config
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

def setup_ssl():
  global sslcontext
  # SSL configured? set up context for server
  if 'ssl' in config:
    sslcontext = SSL.Context(SSL.SSLv23_METHOD)
    sslcontext.use_certificate_file(config['ssl']['cert'])
    sslcontext.use_privatekey_file(config['ssl']['key'])

def setup_database():
  # database configured? initialize it!
  if 'database' in config:
    Database.init(config['database'])

def setup_flask():
  global app
  # set up Flask object, configure it, add API, and go!
  app = Flask('st-lexware')
  app.config.update(**config['flask'])

def setup_ldap():
  global app
  global ldap
  ldap = LDAP(app)

def setup_api():
  global app
  api.init(app, config['api'])

def run_app():
  global app
  app.run(ssl_context=sslcontext, **config['runner'])

if __name__ == '__main__':
  load_config()
  check_config()
  setup_ssl()
  setup_database()
  setup_flask()
  setup_ldap()
  setup_api()
  run_app()
