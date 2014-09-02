function permitted(config, req) {
  if (config.auth !== undefined && config.auth['/legacy/*'] !== undefined) {
    users = config.auth['/legacy/*'];
    // FIXME: hashed passwords!
    if (users[req.authorization.basic.username] !== undefined) {
      if (users[req.authorization.basic.username] == req.authorization.basic.password)
        return true;
    }
  }
  return false;
}

module.exports = {
  permitted: permitted
};
