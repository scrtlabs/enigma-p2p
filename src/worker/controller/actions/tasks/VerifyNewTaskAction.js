/**
 * verify a task
 * */
const constants = require('../../../../common/constants');

class VerifyNewTaskAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const unverifiedTask = params.task;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams)=>{
        // TODO: should the signingKey be passed as is?
        const res = await this._controller.ethereum().verifier().verifyTaskCreation(unverifiedTask, regParams.result.signingKey);
        // TODO: decide what to do with the error...
        if (res.isVerified) {
          unverifiedTask.setGasLimit(res.gasLimit);
        }
        await this._controller.taskManager().asyncOnVerifyTask(unverifiedTask.getTaskId(), res.isVerified);
      },
    });
  }
}
module.exports = VerifyNewTaskAction;
