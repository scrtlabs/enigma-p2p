const constants = require('../../../common/constants');
const TOPICS = constants.PUBSUB_TOPICS;

// TODO:: after pr https://github.com/ipfs/interface-js-ipfs-core/pull/437
class PubSubUnsubscribeAction {
  constructor(controller) {
    this._controller = controller;
  }
  /** subscribe to to self ethereum signing key topic - useful for jsonrpc api
   * @param {string} topic , topic name
   * @param {Function} onPublish , (msg)=>{}
   * @param {Function} onSubscribed, ()=>{}
   * */
  execute(params) {
    // let topic = params.topic;
    // this._controller.engNode().unsubscribe()
  }
}
module.exports = PubSubUnsubscribeAction;
