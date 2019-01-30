const Envelop = require('../../../main_controller/channels/Envelop');
const nodeUtils = require('../../../common/utils');
const Msg = require('../../../common/constants').CORE_REQUESTS;

class GetAllTipsAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }

  execute(envelop){
    console.log("@@@@@@@@@");
    console.log(JSON.stringify(envelop,null,2));
    console.log("!!!!!!!!!!!!!!@@@@@@@@@");
    let request = {
      id : nodeUtils.randId(),
      type :envelop.content().type
    };
    this._coreRuntime.execCmd(Msg.CORE_DB_ACTION,{
      envelop : envelop,
      sendMsg : request,
    });
    // let client = this._coreRuntime.getIpcClient();
    // client.sendJsonAndReceive(,(responseMsg)=>{
    //   const resEnv = new Envelop(envelop.id(),responseMsg, envelop.type());
    //   this._coreRuntime.getCommunicator()
    //     .send(resEnv);
    // });
  }
}
module.exports = GetAllTipsAction;
