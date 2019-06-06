const jayson = require('jayson');

/**
 * Creates a principal mock server
 * @param {Integer} getStateKeysCb
 * @return {Object} principal mock server
 * */
module.exports.create = (getStateKeysCb) => {
  const server = jayson.server({
    getStateKeys: getStateKeysCb,
  }).http().setTimeout(500000);
  server.listen(0, '127.0.0.1');
  return server;
};

module.exports.destroy = (server) => {
  server.close();
};

module.exports.getPort = (server) => {
  return server.address().port;
};
