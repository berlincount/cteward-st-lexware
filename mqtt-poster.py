#!/usr/bin/env python

import sys
import csv
import json
import time
import rrdtool
import requests
import StringIO
import paho.mqtt.client as mqtt

## load config
with open('/etc/cteward/mqtt-poster.json') as config_file:
    config = json.load(config_file)

# {
#    "legacyurl":"1.2.3.4",
#    "username":"username",
#    "password":"password",
#    "mqtt_client_id": "secret",
#    "mqtt_host":"mqtt.host.name",
#    "mqtt_port":1883,
#    "mqtt_prefix":"c-base/crew",
#    "frequency":900
# }

## our HTTP Client
httpc = requests.Session()

## our MQTT Client
mqttc = mqtt.Client(client_id=config['mqtt_client_id'], clean_session=False)

# set up callbacks and connect
mqttc.connect(config['mqtt_host'], config['mqtt_port'])

## our main loop, update stuff
while True:
    result = httpc.get(config['legacyurl'], auth=requests.auth.HTTPBasicAuth(config['username'], config['password']))
    from pprint import pprint
    pprint(result)
    if result.status_code != 200:
        print("Something went wrong.")
        sys.exit(1)
    else:
        from pprint import pprint
        reader = csv.reader(result.content.split('\n'), delimiter=';')
        keys = []
        data = {}
        members = 0
        passive = 0
        for row in reader:
            if len(keys) == 0:
                keys = row
            else:
                user = dict(zip(keys, row))
                if user['Status'] == 'crew':
                    members += 1
                elif user['Status'] == 'passiv':
                    passive += 1

        # '2016-03-02T22:16:44Z'
        now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        # current member counts
        data['members'] = members
        mqttc.publish("{0}/members".format(config['mqtt_prefix']), members, retain=True)
        data['passive'] = passive
        mqttc.publish("{0}/passive".format(config['mqtt_prefix']), passive, retain=True)

        # update time
        data['last_update'] = now
        mqttc.publish("{0}/last_update".format(config['mqtt_prefix']), now, retain=True)

        # update summary
        mqttc.publish(config['mqtt_prefix'], json.dumps(data), retain=True)

        # sleep until we reached the next interval
        time.sleep(config['frequency']-(time.mktime(time.gmtime())%config['frequency']))
