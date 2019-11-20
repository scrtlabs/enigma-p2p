const constants = require("../../common/constants");

class ProxyAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(reqCommunicator, envelop) {
    if (envelop.id()) {
      this._controller
        .getCommunicator(constants.RUNTIME_TYPE.Node)
        .thisCommunicator.sendAndReceive(envelop)
        .then(resEnv => {
          reqCommunicator.send(resEnv);
        });
    }
  }
}
module.exports = ProxyAction;
