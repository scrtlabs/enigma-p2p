const Envelop = require('../../../main_controller/channels/Envelop');

class UpdateDbAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  execute(params){
    /***/
    let request = {
      id : nodeUtils.randId(),
      type : Msg.GetDeltas,
      input : envelop.content().input,
    };
    this._coreRuntime.execCmd(Msg.CORE_DB_READ_ACTION,{
      envelop : envelop,
      sendMsg : request,
    });
    /***/
  }
}
module.exports = UpdateDbAction;
