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
    let dbQueryType = params.dbQueryType;
    this._controller.execCmd(
      constants.NODE_NOTIFICATIONS.UPDATE_DB,
      {
        dbQueryType : dbQueryType,
        input : msgRes,
        onResponse : (err,result)=>{onFinish(err,result);}
      }
    );
  }
}
module.exports = UpdateDbAction;
let c= {};
let c2 = {};
builder.createNetwork(c).createContract(c2).build();
