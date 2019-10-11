const constants = require('../../../../common/constants');
const errors = require('../../../../common/errors');
const cryptography = require('../../../../common/cryptography');
const DeployTask = require('../../../../worker/tasks/DeployTask');

class CommitReceiptAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const task = params.task;
    const callback = params.callback;
    if (!task) return;
    let err = null;

    let result = await this._commitTask(task);
    if (result.error) {
      this._controller.logger().error(`[COMMIT_RECEIPT] error for task ${task.getTaskId()} error=  ${result.error}`);
      err = result.error;
    }
    else {
      this._controller.logger().info(`[COMMIT_RECEIPT] success for ${result.method} of task ${task.getTaskId()} receipt = ${result.txReceipt}`);
    }
    if (callback) {
      callback(err);
    }
  }
  async _commitTask(task) {
    let res;
    if (task.getResult().isSuccess()) {
      res = await this._commitSuccessTask(task);
    } else {
      res = await this._commitFailedTask(task);
    }
    return res;
  }
  async _commitFailedTask(task) {
    let txReceipt = null;
    let err = null;
    let method = null;

    // Deploy task
    if(task instanceof DeployTask) {
      try {
        txReceipt = await this._controller.ethereum().api().deploySecretContractFailure(
          task.getTaskId(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );
        method = "deploySecretContractFailure";
      }
      catch (e) {
        err = e;
      }
    }
    // Compute task
    else {
      try {
        txReceipt = this._controller.ethereum().api().commitTaskFailure(
          task.getContractAddr(),
          task.getTaskId(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );
        method = "commitTaskFailure";
      }
      catch (e) {
        err = e;
      }
    }
    return {error: err, txReceipt: txReceipt, method: method};
  }
  async _commitSuccessTask(task) {
    let txReceipt = null;
    let err = null;
    let method = null;

    const isDelta = task.getResult().hasDelta();
    const output = task.getResult().getOutput();

    // Deploy task
    if(task instanceof DeployTask) {
      if (!output) {
        err = new errors.InputErr(`No output for deploy task ${task.getTaskId()}`);
      }
      else if (!isDelta) {
        err = new errors.InputErr(`No delta for deploy task ${task.getTaskId()}`);
      }
      else {
        try {
          txReceipt = await this._controller.ethereum().api().deploySecretContract(
            task.getTaskId(),
            task.getResult().getPreCodeHash(),
            cryptography.hash(output),
            cryptography.hash(task.getResult().getDelta().data),
            task.getResult().getEthPayload(),
            task.getResult().getEthAddr(),
            task.getResult().getUsedGas(),
            task.getResult().getSignature(),
          );
          method = "deploySecretContract";
        }
        catch (e) {
          err = e;
        }
      }
    }
    // Compute task
    else {
      let outputHash = constants.ETHEREUM_EMPTY_HASH;
      let deltaHash = constants.ETHEREUM_EMPTY_HASH;

      if (output) {
        outputHash = cryptography.hash(output);
      }
      if (isDelta) {
        deltaHash = cryptography.hash(task.getResult().getDelta().data);
      }
      try {
        txReceipt = await this._controller.ethereum().api().commitReceipt(
          task.getContractAddr(),
          task.getTaskId(),
          deltaHash,
          outputHash,
          task.getResult().getEthPayload(),
          task.getResult().getEthAddr(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );
        method = "commitReceipt";
      }
      catch (e) {
        err = e;
      }
    }
    return {error: err, txReceipt: txReceipt, method: method};
  }
}

module.exports = CommitReceiptAction;
