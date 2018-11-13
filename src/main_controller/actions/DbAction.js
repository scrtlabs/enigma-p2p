const constatnts = require('../../common/constants');

class DbAction{
  constructor(controller) {
    this._controller = controller;
  }
  execute(reqCommunicator, envelop) {
    //TODO:: go to db and get all tips
    if(envelop.id()){
      console.log('[DbAction:] got request ' + envelop.type());
      // pass to core
      let dbCommunicator = this._controller.getCommunicator(constatnts.RUNTIME_TYPE.Core).thisCommunicator;
      dbCommunicator.sendAndReceive(envelop)
      .then(resEnv=>{
        console.log("[DbAction:] passing back to origin requester");
        reqCommunicator.send(resEnv);
      });
    }
  }
}


// execute(communicator, envelop) {
//   if (envelop.id()) {
//     console.log('Action: got ' + envelop.type() + ' ' + JSON.stringify(envelop.content()));
//     console.log('Action: sending back envelop');
//     const type = 'dummy';
//     // if we need another runtime communicator
//     // let dbCommunicator = this._controller.getCommunicator("db");
//     // now send messages to db for example
//     //
//     const resEnv = new Envelop(envelop.id(), {'response': 'some response data'}, type);
//     communicator.send(resEnv);
//   }
// }
module.exports = DbAction;
