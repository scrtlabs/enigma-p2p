/** Policy class that handles messages policy*/
const constants = require('../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const PUBSUB_TOPICS = constants.PUBSUB_TOPICS;

class Policy {
  constructor(){
  }
  /** is a valid procol name
   * @param {String} protocolName,
   * @return {Boolean}, is valid protocol
   */
  isValidProtocol(protocolName) {
    for (const key in PROTOCOLS) {
      if (PROTOCOLS[key] === protocolName) {
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
}

module.exports = Policy;
