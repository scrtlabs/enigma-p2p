/**
 * This action is responsible for writting to the db of core.
 * not directly of course.
 * this will write:
 * - new contract bytecode
 * - new deltas to an existing contract.
 * */
const constants = require('../../../../../common/constants');

class UpdateDbAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let msgRes = params.data;
    let onFinish = params.callback;
    this._controller.execCmd(
      constants.NODE_NOTIFICATIONS.DB_REQUEST,
      {
        input : msgRes,
        dbQueryType : constants.CORE_REQUESTS.UpdateDb,
        onResponse : (err,result)=>{onFinish(err,result);}
      }
    );
  }
}
module.exports = UpdateDbAction;
