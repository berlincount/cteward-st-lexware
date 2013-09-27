#!/usr/bin/env python

import json
import pymssql

config = json.load(open('/etc/cteward/st-flask-lexware.json'))

conn = pymssql.connect(as_dict = True, **config['database'])
cur = conn.cursor()

cur.execute('SELECT Nachname,Vorname,Kurzname,Kennung3,Telefon3,Eintritt,Austritt,Firma1,Betreung,AnredeTitel,Strasse,PLZ,Ort FROM Adresse ORDER BY Nachname')
for row in cur:
  print "Nachname=%s, Vorname=%s" % (row['Nachname'], row['Vorname'])

conn.close()

