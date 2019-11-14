/**
 * verify a task
 * */
const constants = require('../../../../common/constants');
const ethUtils = require("../../../../common/utils")

class VerifyNewTaskAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    let onResult = params.onResponse;
    const unverifiedTask = params.task;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams) => {
        // TODO: remove this default!!!!
        let isVerified = true;
        if (this._controller.hasEthereum()) {
          isVerified = false;
          try {
            const currentBlockNumber = await ethUtils.getEthereumBlockNumber(this._controller.ethereum().api().w3());
            let res = await this._controller.ethereum().verifier().verifyTaskCreation(unverifiedTask, currentBlockNumber, regParams.result.signingKey);
            if (res.error) {
              this._controller.logger().info(`[VERIFY_NEW_TASK] error in verification of task ${unverifiedTask.getTaskId()}: ${res.error}`);
            }
            else if (res.isVerified) {
              unverifiedTask.setGasLimit(res.gasLimit);
              unverifiedTask.setBlockNumber(res.blockNumber);
              this._controller.logger().debug(`[VERIFY_NEW_TASK] successful verification of task ${unverifiedTask.getTaskId()}`);
              isVerified = true;
            }
          }
          catch (err) {
            this._controller.logger().error(`[VERIFY_NEW_TASK] an exception occurred while trying to verify task ${unverifiedTask.getTaskId()} = ${err}`);
          }
        }
        await this._controller.taskManager().asyncOnVerifyTask(unverifiedTask.getTaskId(), isVerified);
        if (onResult) {
          onResult(null, isVerified);
        }
      },
    });
  }

  async asyncExecute(params) {
    const action = this;
    return new Promise((res, rej) => {
      params.onResponse = function (err, verificationResult) {
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
