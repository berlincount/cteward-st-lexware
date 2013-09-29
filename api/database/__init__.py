
"""cteward/st-lexware database access

connects to a MS SQL server holding Lexware data, takes care of queries and
data normalization.
"""

import pymssql
from datetime import datetime, date

class Database:
  database = None
  """database connection object"""

  @staticmethod
  def init(config):
    """connect to database

    connects to MS SQL server, informing Python about the encoding to be
    expected for data received. also requesting results to be returned as
    dicts.

    config -- a dict containing parameters passed through.
    """
    Database.database = pymssql.connect(charset = 'ISO-8859-15', as_dict = True, **config)

  @staticmethod
  def getmembers():
    """get list of members in legacy form, as a dict"""
    cur = Database.database.cursor()
    # request relevant data from Lexware
    # DATETIME is converted to ISO date string on server side
    cur.execute("SELECT AdrNr,Firma4 AS Firma,Nachname,Vorname,Kurzname AS Crewname,Kennung3 AS Rohstatus,Telefon3 AS Ext_Mail,CONVERT(VARCHAR(8),Eintritt,112) AS Eintritt,CONVERT(VARCHAR(8),Austritt,112) AS Austritt FROM Adresse ORDER BY Nachname")
    members = cur.fetchall()

    # list of crew names, for tracking duplicates
    crewnames = {}

    # we need to touch every member to ensure sanity
    for member in members:

      # re-normalize information encoded in status
      status = member['Rohstatus']
      if status is None or status == '':
        status = 'crew'
      if status.startswith('check'):
        status = 'crew'
      if status.startswith('crew'):
        status = 'crew'
      if status.startswith('passiv'):
        status = 'passiv'

      # fix missing entry date
      if member['Eintritt'] is None:
        member['Eintritt'] = '19700101'

      # member has a set end date?
      if member['Austritt'] is not None:
        # extract datetime object from string
        austritt = datetime.strptime(member['Austritt'], '%Y%m%d')
        # honor end date
        # FIXME: need to add 24h to end at end of day
        if austritt < datetime.now():
          if status == 'crew':
            status = 'ex-crew'
          elif status == 'passiv':
            status = 'ex-crew'
          elif status == 'raumfahrer':
            status = 'ex-raumfahrer'

      if member['Crewname'] is not None and member['Crewname'] != '':
        # get information encoded in crewname (ugh)
        # FIXME: get rid of these special cases
        if member['Crewname'].startswith('disabled-'):
          status = 'ex-crew'

        # check for duplicates and get rid of them
        if member['Crewname'] in crewnames:
          raise Exception("Duplicate crewname %s" % member['Crewname'])
        else:
          crewnames[member['Crewname']] = member

      # store REAL status in dict
      member['Status'] = status

    return members
