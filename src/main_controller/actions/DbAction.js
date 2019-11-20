const constatnts = require("../../common/constants");

class DbAction {
  constructor(controller) {
    this._controller = controller;
  }
  execute(reqCommunicator, envelop) {
    //TODO:: go to db and get all tips
    if (envelop.id()) {
      // pass to core
      //TODO:: rethink this "return" cuz if happens its not normal. comment out and run jsonrpc_test #6
      if (!this._controller.getCommunicator(constatnts.RUNTIME_TYPE.Core)) {
        return;
      }
      let dbCommunicator = this._controller.getCommunicator(
        constatnts.RUNTIME_TYPE.Core
      ).thisCommunicator;
      dbCommunicator.sendAndReceive(envelop).then(resEnv => {
        reqCommunicator.send(resEnv);
      });
    }
  }
}
module.exports = DbAction;
