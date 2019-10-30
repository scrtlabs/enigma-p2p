/**
 * isDiscover : true/false
 * Config:
 * bootstrapNodes : [],
 * optimalDht : 22,
 * port : 0, otherwise number
 * nickname : "nick1" optional,
 * multiAddrs : ['/ip4/0.0.0.0/tcp/']
 * namespace : 'ipfs',
 * idPath : '/path/to/id' or null,
 */

const constants = require("../../common/constants");
const EnigmaNode = require("../EnigmaNode");
const ProtocolHandler = require("../handlers/ProtocolHandler");

/** WIP - load the node configration
 * @param {String} path, path to config or default in /config/debug.json
 * @return {Json} configObj
 * */
module.exports.loadConfig = function(path) {
  return _loadConfig(path);
};
/** WIP - build the Node given a config object
 * @param {Json} config
 * @param {Logger} logger
 * @return {EnigmaNode} engNode
 * */
module.exports.build = function(config, logger) {
  return _buildNode(config, logger);
};

function _loadConfig(path) {
  let config = null;
  if (path) {
    config = require(path);
  } else {
    config = require(constants.configPath);
  }
  return Object.assign({}, config, {});
}

function _buildNode(config, logger) {
  const options = {};
  options.isDiscover = config.isDiscover;
  const maAddrs = config.multiAddrs;
  options.multiAddrs = [];
  options.dnsNodes = config.bootstrapNodes;
  options.namespace = config.namespace;
  options.optimalDht = config.optimalDht;
  options.port = config.port;
  options.nickname = config.nickname;
  options.pathPeerId = config.idPath;
  // parsed multi-addrs with port
  maAddrs.forEach(ma => {
    options.multiAddrs.push(ma + options.port);
  });

  return new EnigmaNode(options, new ProtocolHandler(logger), logger);
}
