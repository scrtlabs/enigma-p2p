/**
 * This action is responsible for writting to the db of core.
 * not directly of course.
 * this will write:
 * - new contract bytecode
 * - new deltas to an existing contract.
 * */
class UpdateDbAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let msgRes = params.data;
    let onFinish = params.callback;
    let dbQueryType = params.dbQueryType;


  }
}
module.exports = UpdateDbAction;
