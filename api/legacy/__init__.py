
"""cteward/st-lexware legacy data

provides legacy access to Lexware's data
"""

import string
from datetime import datetime
from flask import request, Response
from flask.ext import restful
from api.database import Database
from functools import wraps
import ldap

def set_access(new_access):
  """set username & password list"""
  global access
  access = new_access


def check_auth(username, password):
  """This function is called to check if a username /
  password combination is valid.
  """
  global access
  if username in access:
    if access[username] == password:
      return True
  try:
    l = ldap.initialize('ldap://10.0.1.7')
    try:
      l.bind_s('uid=%s,ou=crew,dc=c-base,dc=org' % username, password)
    except ldap.INVALID_CREDENTIALS:
      return False
    finally:
      l.unbind()
    return True
  except Exception as e:
    print e
    return False
  return False

def authenticate():
  """Sends a 401 response that enables basic auth"""
  return Response(
    'Could not verify your access level for that URL.\n'
    'You have to login with proper credentials', 401,
    {'WWW-Authenticate': 'Basic realm="Login Required"'})

def requires_auth(f):
  @wraps(f)
  def decorated(*args, **kwargs):
    auth = request.authorization
    if not auth or not check_auth(auth.username, auth.password):
      return authenticate()
    return f(*args, **kwargs)
  return decorated


class Monitor(restful.Resource):
  """test overall availability end-to-end"""
  def get(self):
    return {'status': 'OK' if Database.ping() else 'BROKEN'}

class MemberList(restful.Resource):
  """fetch memberlist from database after authorization"""
  @requires_auth
  def get(self):
    members = Database.getmembers()
    return members

class MemberListCSV(MemberList):
  """provided memberlist in format similar to legacy ldapuser.php"""
  keys = [
    'Nachname',
    'Vorname',
    'Crewname',
    'Status',
    'Ext_Mail',
    'Eintritt',
    'Paten',
    'Weiteres'
  ]
  """filtered field list with legacy order"""

  @requires_auth
  def dispatch_request(self):
    output = ""
    for num, key in enumerate(MemberListCSV.keys):
      # override field description in CSV header
      if key == 'Ext_Mail':
        key = 'externe E-Mail'
      # ; before every but the first entry
      if num:
        output += ';'
      output += key

    # fetch list of data from MemberList parent
    members = super(MemberListCSV, self).get()

    # output every member
    for member in members:
      output += "\n"
      # ignore empty/misconfigured members
      if member['Crewname'] is None or member['Crewname'] == '':
        continue

      for num, key in enumerate(MemberListCSV.keys):
        # ; before every but the first entry
        if num:
          output += ';'
        # ignore additional field & empty values
        if key != 'Weiteres' and member[key] is not None:
          # convert & strip date to expected german, non-0-prefixed format
          if key == 'Eintritt' or key == 'Austritt' and member[key]:
            # '20130905' -> datetime
            date           = datetime.strptime(member[key], '%Y%m%d')
            # -> ' 5.09.2013'
            date_formatted = date.strftime('%e.%m.%Y')
            # -> '5.9.2013'
            date_trimmed   = date_formatted.replace('.0','.',1).replace(' ','')
            member[key] = date_trimmed
          if key == 'Paten':
            member[key] = string.join(member[key], ',')
          output += member[key]

    resp = Response(response=output,
                    status=200,
                    mimetype="text/csv")

    output += "\n"
    return resp

class Members(MemberList):
  @requires_auth
  def get(self):
    members = super(Members, self).get()
    return [member for member in members if member['Crewname'] == request.authorization.username]
