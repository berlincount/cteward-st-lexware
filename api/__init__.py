
"""cteward/st-lexware RESTful API

provides legacy & future read access to Lexware's data
"""

from flask.ext.restful import Api

import database
import legacy

def init(app, config):
  """populate Flask app object with Api & resources"""
  # push access configuration into class variable
  # TODO: refactor
  legacy.MemberList.set_access(config['legacy']['access'])

  api = Api(app)

  # legacy resources
  api.add_resource(legacy.Monitor,    '/legacy/monitor',    methods=['GET',])
  api.add_resource(legacy.MemberList, '/legacy/memberlist', methods=['GET',])
  # the old format (ldapuser.php) returns CSV - and nothing else.
  app.add_url_rule('/legacy/memberlist-oldformat', view_func=legacy.MemberListCSV.as_view('oldformat'), methods=['GET',])
