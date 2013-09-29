
"""cteward/st-lexware legacy data

provides legacy access to Lexware's data
"""

import string
from datetime import datetime
from flask import Response
from flask.ext import restful
from flask.ext.httpauth import HTTPBasicAuth

from api.database import Database

class Monitor(restful.Resource):
  """test overall availability end-to-end"""
  # FIXME: implementation?!?
  def get(self):
    return {'status': 'OK'}

class MemberList(restful.Resource):
  """fetch memberlist from database after authorization"""
  access = {}
  """dict with username -> password mapping"""
  auth   = HTTPBasicAuth()
  """flask.ext.httpauth object handling authentication"""

  @auth.get_password
  def get_password(username):
    """fetch password from internal dict"""
    if username in MemberList.access:
      return MemberList.access[username]
    return None

  @staticmethod
  def set_access(access):
    """set username & password list"""
    MemberList.access = access

  @auth.login_required
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
    'Weiteres'
  ]
  """filtered field list with legacy order"""

  @MemberList.auth.login_required
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
    output += "\n"

    # fetch list of data from MemberList parent
    members = super(MemberListCSV, self).get()

    # output every member
    for member in members:
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
          output += member[key]
      output += "\n"

    resp = Response(response=output,
                    status=200,
                    mimetype="text/csv")

    return resp
