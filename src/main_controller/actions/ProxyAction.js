const constants = require('../../common/constants');

class ProxyAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(reqCommunicator, envelop) {
    // TODO:: go to db and get all tips
    if (envelop.id()) {
      // pass to core
      this._controller.getCommunicator(constants.RUNTIME_TYPE.Node)
          .thisCommunicator
          .sendAndReceive(envelop)
          .then((resEnv)=>{
            reqCommunicator.send(resEnv);
          });
    }
  }
}
module.exports = ProxyAction;
