const Envelop = require('../../../main_controller/channels/Envelop');
const nodeUtils = require('../../../common/utils');
const Msg = require('../../../common/constants').CORE_REQUESTS;

class GetDbAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }

  execute(envelop){
    let request;
    if(envelop.content().type == Msg.PTTResponse) {
      request = {
        id : nodeUtils.randId(),
        type : envelop.content().type,
        response : envelop.content().input
      };
    } else {
      request = {
        id : nodeUtils.randId(),
        type : envelop.content().type,
        input : envelop.content().input
      };
    }
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
module.exports = GetDbAction;
