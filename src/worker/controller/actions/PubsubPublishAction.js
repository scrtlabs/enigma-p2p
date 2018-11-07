const constants = require('../../../common/constants');
const TOPICS = constants.PUBSUB_TOPICS;


class PubsubPublishAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const topic = params.topic;
    const msgBuffer = Buffer.from(params.message);

    if (!this._controller.policy().isValidTopic(topic)) {
      console.log('[-] Err invalid topic name ' + topic);
      return;
    }

    this._controller.engNode().broadcast(
        topic,
        msgBuffer,
        ()=>{
          console.log('published [' + TOPICS.BROADCAST+']');
        }
    );
  }
}
module.exports = PubsubPublishAction;
