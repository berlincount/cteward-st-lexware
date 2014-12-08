var Promise      = require('bluebird');
module.exports = {
  find_permission: Promise.method(function find_permissions(v) {
    v.permission = v.permissions['_board_'];
    for (var key in v.permission)
      v[key] = v.permission[key];
    return v;
  })
};
