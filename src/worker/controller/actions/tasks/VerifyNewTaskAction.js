/**
 * verify a task
 * */
const constants = require('../../../../common/constants');

class VerifyNewTaskAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    let onResult = params.onResponse;
    const unverifiedTask = params.task;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams)=>{
        // TODO: remove this default!!!!
        let res = {isVerified : true};
        if(this._controller.hasEthereum()){
          res = await this._controller.ethereum().verifier().verifyTaskCreation(unverifiedTask, regParams.result.signingKey);
          // TODO: decide what to do with the error...
          if (res.isVerified) {
            unverifiedTask.setGasLimit(res.gasLimit);
          }
        }
        await this._controller.taskManager().asyncOnVerifyTask(unverifiedTask.getTaskId(), res.isVerified);
        if(onResult){
          onResult(null, res);
        }
      },
    });
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej)=>{
      params.onResponse = function(err, verificationResult) {
        if (err) rej(err);
        else res(verificationResult);
      };
      action.execute(params);
    });
  }
}
module.exports = VerifyNewTaskAction;




// let c = nodeController;
// let isVerified= await c.asyncExecCmd('verify aeubesiuhf', {task: Task});
