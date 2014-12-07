var Promise      = require('bluebird');
module.exports = {
  /*
  permitted: function permitted(config, req) {
    if (config.auth !== undefined && config.auth['/legacy/*'] !== undefined) {
      users = config.auth['/legacy/*'];
      // FIXME: hashed passwords!
      if (users[req.authorization.basic.username] !== undefined) {
        if (users[req.authorization.basic.username] == req.authorization.basic.password)
          return true;
      }
    }
    return false;
  },
  */
  find_permission: Promise.method(function find_permissions(v) {
    throw new Error("This is disabled!");
    v.permission = v.permissions['_board_'];
    for (var key in v.permission)
      v[key] = v.permission[key];
    return v;
  }),
  /*
  handle_query: function handle_query(req, res, authmap, mapping, renderer, next) {
    //console.log(JSON.stringify(req));
    //console.log(JSON.stringify(res));
    console.log(JSON.stringify(authmap));
    console.log(JSON.stringify(mapping));
    console.log(JSON.stringify(renderer));
    console.log(JSON.stringify(next));
    res.end(JSON.stringify("ja und jetzt?", null, 2));
    return next();
  },
  */
};
