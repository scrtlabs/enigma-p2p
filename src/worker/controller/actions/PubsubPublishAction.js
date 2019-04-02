const constants = require('../../../common/constants');
const nodeUtils = require('../../../common/utils');

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
          this._controller.logger().debug(`published [${topic}]`);
        }
    );
  }
}
module.exports = PubsubPublishAction;
