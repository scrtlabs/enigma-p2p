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
      this._controller.logger().error(`[COMMIT_RECEIPT] error for task ${task.getTaskId()} error=  ${e}`);
      err = result.error;
    }
    else {
      this._controller.logger().info(`[COMMIT_RECEIPT] success for task ${task.getTaskId()} receipt = ${result.txReceipt}`);
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

    // Deploy task
    if(task instanceof DeployTask) {
      try {
        txReceipt = await this._controller.ethereum().api().deploySecretContractFailure(
          task.getTaskId(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );
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
      }
      catch (e) {
        err = e;
      }
    }
    return {error: err, txReceipt: txReceipt};
  }
  async _commitSuccessTask(task) {
    let txReceipt = null;
    let err = null;
    const delta = task.getResult().getDelta();
    const output = task.getResult().getOutput();

    // Deploy task
    if(task instanceof DeployTask) {
      if (!output) {
        err = new errors.InputErr(`No output for deploy task ${task.getTaskId()}`);
      }
      else if (!delta || (!`data` in delta) || !(delta.data)) {
        err = new errors.InputErr(`No delta for deploy task ${task.getTaskId()}`);
      }
      else {
        try {
          txReceipt = await this._controller.ethereum().api().deploySecretContract(
            task.getTaskId(),
            task.getResult().getPreCodeHash(),
            cryptography.hash(output),
            cryptography.hash(delta.data),
            task.getResult().getEthPayload(),
            task.getResult().getEthAddr(),
            task.getResult().getUsedGas(),
            task.getResult().getSignature(),
          );
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
      if (delta && parseInt(delta.key) !== 0) {
        deltaHash = cryptography.hash(delta.data);
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
      }
      catch (e) {
        err = e;
      }
    }
    return {error: err, txReceipt: txReceipt};
  }
}

module.exports = CommitReceiptAction;
