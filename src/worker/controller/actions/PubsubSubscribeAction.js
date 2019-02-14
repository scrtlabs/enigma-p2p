const constants = require('../../../common/constants');
const TOPICS = constants.PUBSUB_TOPICS;


class PubsubSubscribeAction {
  constructor(controller) {
    this._controller = controller;
  }
  /** subscribe to to self ethereum signing key topic - useful for jsonrpc api
   * @param {string} topic , topic name
   * @param {Function} onPublish , (msg)=>{}
   * @param {Function} onSubscribed, ()=>{}
   * */
  execute(params) {
    const topic = params.topic;
    const topicHandler = params.onPublish;
    const finalHandler = params.onSubscribed;
    this._controller.engNode().subscribe([
      {
        topic: topic,
        topic_handler: (msg)=>{
          topicHandler(msg);
        },
        final_handler: ()=>{
          finalHandler();
        },
      },
    ]);
  }
}
module.exports = PubsubSubscribeAction;
