const cryptography = require('../../../../common/cryptography');
const errors = require('../../../../common/errors');

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
          }
        }
      },
    });
  }
  _commitTask(task, txParams) {
    if (task.getResult().isSuccess() && task.getResult().getDelta().data && task.getResult().getOutput()) {
      return this._commitSuccessTask(task, txParams);
    } else if (task.getResult().isFailed()) {
      return this._commitFailedTask(task, txParams);
    }
    throw errors.TypeErr(`wrong type or missing fields in Result`);
  }
  _commitFailedTask(task, txParams) {
    return this._controller.ethereum().api().commitTaskFailure(
        task.getContractAddr(),
        task.getTaskId(),
        task.getResult().getUsedGas(),
        task.getResult().getSignature(),
        txParams
    );
  }
  _commitSuccessTask(task, txParams) {
    return this._controller.ethereum().api().commitReceipt(
        task.getContractAddr(),
        task.getTaskId(),
        cryptography.hash(task.getResult().getDelta().data),
        cryptography.hash(task.getResult().getOutput()),
        task.getResult().getUsedGas(),
        task.getResult().getEthPayload(),
        task.getResult().getSignature(),
        txParams
    );
  }
}
module.exports = CommitReceiptAction;
