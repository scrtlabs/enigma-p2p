const constatnts = require('../../common/constants');

class DbAction{
  constructor(controller) {
    this._controller = controller;
  }
  execute(reqCommunicator, envelop) {
    //TODO:: go to db and get all tips
    if(envelop.id()){
      // pass to core
      let dbCommunicator = this._controller.getCommunicator(constatnts.RUNTIME_TYPE.Core).thisCommunicator;
      dbCommunicator.sendAndReceive(envelop)
      .then(resEnv=>{
        reqCommunicator.send(resEnv);
      });
    }
  }
}
module.exports = DbAction;
