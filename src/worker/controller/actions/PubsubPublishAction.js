const constants = require('../../../common/constants');
const TOPICS = constants.PUBSUB_TOPICS;


class PubsubPublishAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const topic = params.topic;
    const msgBuffer = Buffer.from(params.message);
    this._controller.engNode().broadcast(
        topic,
        msgBuffer,
        ()=>{
          console.log('published [' + topic +']');
        }
    );
  }
}
module.exports = PubsubPublishAction;
