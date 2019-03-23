const Envelop = require('../../main_controller/channels/Envelop');
const nodeUtils = require('../../common/utils');
const Msg = require('../../common/constants').CORE_REQUESTS;

class PreParseAction{
  constructor(coreRuntime){
    this._coreRuntime = coreRuntime;
  }
  execute(envelop){
    console.log('------ PREPARSEACTION -----------');
    console.log(envelop);
    let request = envelop.content();
    this._coreRuntime.execCmd(Msg.CORE_DB_ACTION,{
      envelop : envelop,
      sendMsg : request,
    });
  }
}
module.exports = PreParseAction;
