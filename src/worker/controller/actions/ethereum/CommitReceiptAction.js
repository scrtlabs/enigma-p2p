const constants = require('../../../../common/constants');
const cryptography = require('../../../../common/cryptography');
const errors = require('../../../../common/errors');
const DeployTask = require('../../../../worker/tasks/DeployTask');

class CommitReceiptAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const task = params.task;
    const callback = params.callback;
    if (!task) return;
    this._controller.execCmd(constants.NODE_NOTIFICATIONS.REGISTRATION_PARAMS, {
      onResponse: async (err, regParams)=>{
        if (err) {
          this._controller.logger().error(`[COMMIT_RECEIPT] error error for task ${task.getTaskId()} error=  ${err}`);
        }
        else {
          const txParams = {from: regParams.result.signingKey};
          try {
            const txReceipt = await this._commitTask(task, txParams);
            this._controller.logger().info(`[COMMIT_RECEIPT] success for task ${task.getTaskId()} receipt = ${txReceipt}`);
          } catch (e) {
            this._controller.logger().error(`[COMMIT_RECEIPT] error for task ${task.getTaskId()} error=  ${e}`);
            err = e;
          }

        }
        if (callback) {
          callback(err);
        }
      },
    });
  }
  _commitTask(task, txParams) {
    if (task.getResult().isSuccess() && task.getResult().getDelta().data && task.getResult().getOutput()) {
      return this._commitSuccessTask(task, {from: '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'});
    } else if (task.getResult().isFailed()) {
      return this._commitFailedTask(task, {from: '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'});
    }
    throw errors.TypeErr(`wrong type or missing fields in Result`);
  }
  _commitFailedTask(task, txParams) {
    if(task instanceof DeployTask) {
      return this._controller.ethereum().api().deploySecretContractFailure(
        task.getTaskId(),
        task.getResult().getUsedGas(),
        task.getResult().getSignature(),
        txParams
      );
    }
    return this._controller.ethereum().api().commitTaskFailure(
      task.getContractAddr(),
      task.getTaskId(),
      task.getResult().getUsedGas(),
      task.getResult().getSignature(),
      txParams
    );
  }
  _commitSuccessTask(task, txParams) {
    if(task instanceof DeployTask) {
      return this._controller.ethereum().api().deploySecretContract(
          task.getTaskId(),
          task.getResult().getPreCodeHash(),
          cryptography.hash(task.getResult().getOutput()),
          cryptography.hash(task.getResult().getDelta().data),
          task.getResult().getEthPayload(),
          task.getResult().getEthAddr(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
          txParams
      );
    }
    return this._controller.ethereum().api().commitReceipt(
      task.getContractAddr(),
      task.getTaskId(),
      cryptography.hash(task.getResult().getDelta().data),
      cryptography.hash(task.getResult().getOutput()),
      task.getResult().getEthPayload(),
      task.getResult().getEthAddr(),
      task.getResult().getUsedGas(),
      task.getResult().getSignature(),
      txParams
    );
  }
}
module.exports = CommitReceiptAction;
