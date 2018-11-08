/** Policy class that handles messages policy*/
const EventEmitter = require('events').EventEmitter;
const constants = require('../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const PUBSUB_TOPICS = constants.PUBSUB_TOPICS;

class Policy extends EventEmitter {
  constructor() {
    super();
    this._version = '0.1';
    // TODO:: define from config
    this._CRITICAL_LOW_DHT_SIZE = constants.DHT_STATUS.CRITICAL_LOW_DHT_SIZE;
    this._OPTIMAL_DHT_SIZE = constants.DHT_STATUS.OPTIMAL_DHT_SIZE;
    this._CRITICAL_HIGH_DHT_SIZE = constants.DHT_STATUS.CRITICAL_HIGH_DHT_SIZE;
    this._TIMEOUT_FIND_PROVIDERS = constants.DHT_STATUS.TIMEOUT_FIND_PROVIDER;
  }
  /** get the optimal number of outbound connections
   * @return {Integer}
   */
  getOptimalDhtSize() {
    return this._OPTIMAL_DHT_SIZE;
  }
  getCriticalLowDhtSize() {
    return this._CRITICAL_LOW_DHT_SIZE;
  }

  getTimeoutFindProvider() {
    return this._TIMEOUT_FIND_PROVIDERS;
  }
  policyVersion() {
    return this._version;
  }
  /** Validate peer
   * @param {peerInfo} peerInfo the peer info
   * @param {PongMsg} policyBundle contains the pong message from the peer
   * @return {Boolean}
   */
  isValidPeer(peerInfo, policyBundle) {
    return true;
  }
  /** Validate all protocols configured
   * @param {Array} registeredProtocols, list of protocol names
   * @return {Boolean} true if valid false otherwise
   */
  validateProtocols(registeredProtocols) {
    const shouldExist = Object.values(PROTOCOLS);

    if (shouldExist.length > registeredProtocols.length) {
      return false;
    }

    const missingValue = shouldExist.some((p)=>{
      if (registeredProtocols.indexOf(p) < 0) {
        return true;
      }
    });
    return !missingValue;
  }
  /** is a valid procol name
   * @param {String} protocolName,
   * @return {Boolean}, is valid protocol
   */
  isValidProtocol(protocolName) {
    for (const key in PROTOCOLS) {
      if (PROTOCOLS[key] == protocolName) {
        return true;
      }
    }
    return false;
  }
  /**
   * is a valid topic name
   * @param {String} topicName
   * @return {Boolean} , is valid topic
   */
  isValidTopic(topicName) {
    for (const key in PUBSUB_TOPICS) {
      if (PUBSUB_TOPICS[key] === topicName) {
        return true;
      }
    }
    return false;
  }
  /** Validate JSON RPC message type
   * @param {Json} msg, some json
   * @return {Boolean} isValid
   */
  validJsonRpc(msg) {
    return 'jsonrpc' in msg &&
                (('method' in msg && 'params') || 'result' in msg ) &&
                'id' in msg;
  }
  /** check if the number of connected bootstrap nodes is satifying
   * @param {Integer} n, number of handshaked bootstrap nodes
   * @return {Boolean} bool, True => Enough, False => Otherwise
   */
  isEnoughBNodes(n) {
    if (n>0) {
      return true;
    }
  }
}

module.exports = Policy;
