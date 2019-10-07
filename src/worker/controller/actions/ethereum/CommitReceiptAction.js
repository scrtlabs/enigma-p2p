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
    let result;

    if (task instanceof DeployTask) {
      result = await this._commitDeployTask();
      if (result.error) {
        err = result.error;
      }
      else {
        this._controller.logger().info(`[COMMIT_RECEIPT] success for deploy of task ${task.getTaskId()}`);
      }
    }
    else {
      result = await this._commitComputeTask();
      if (result.error) {
        err = result.error;
      }
      else {
        this._controller.logger().info(`[COMMIT_RECEIPT] success for compute of task ${task.getTaskId()}`);
      }
    }
    if (callback) {
      callback(err);
    }
  }

  async _commitDeployTask(task) {
    let err = null;

    const isDelta = task.getResult().hasDelta();

    if (task.getResult().isSuccess()) {
      if (!isDelta) {
        err = new errors.InputErr(`No delta for deploy task ${task.getTaskId()}`);
      }
      else {
        try {
          let events = await this._controller.ethereum().api().deploySecretContract(
            task.getTaskId(),
            task.getResult().getPreCodeHash(),
            cryptography.hash(task.getResult().getOutput()),
            cryptography.hash(task.getResult().getDelta().data),
            task.getResult().getEthPayload(),
            task.getResult().getEthAddr(),
            task.getResult().getUsedGas(),
            task.getResult().getSignature(),
          );

          //TODO: improve this: use services concept instead of the raw Enigma contract events
          if (constants.RAW_ETHEREUM_EVENTS.ReceiptFailedETH in events) {
            this._controller.logger().info(`[COMMIT_RECEIPT] received ReceiptFailedETH event after committing deploy task ${task.getTaskId()}.. Reverting state`);
            let res = await this._revertState(task, true);
            err = res.error;
          }
        }
        catch (e) {
          this._controller.logger().info(`[COMMIT_RECEIPT] received an error while trying to commit deployment of task ${task.getTaskId()} error=${e}.. Reverting state`);
          let res = await this._revertState(task, true);
          err = res.error;
        }
      }
    }
    else {
      try {
        await this._controller.ethereum().api().deploySecretContractFailure(
          task.getTaskId(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );
      }
      catch (e) {
        this._controller.logger().info(`[COMMIT_RECEIPT] received an error while trying to commit failed deploy task ${task.getTaskId()} error= ${e}`);
        err = e;
      }
    }
    return {error: err};
  }

  async _commitComputeTask(task) {
    let err = null;

    const isDelta = task.getResult().hasDelta();

    if (task.getResult().isSuccess()) {
      let deltaHash = constants.ETHEREUM_EMPTY_HASH;

      if (isDelta) {
        deltaHash = cryptography.hash(task.getResult().getDelta().data);
      }
      try {
        let events = await this._controller.ethereum().api().commitReceipt(
          task.getContractAddr(),
          task.getTaskId(),
          deltaHash,
          cryptography.hash(task.getResult().getOutput()),
          task.getResult().getEthPayload(),
          task.getResult().getEthAddr(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );

        //TODO: improve this: use services concept instead of the raw Enigma contract events
        if (constants.RAW_ETHEREUM_EVENTS.ReceiptFailedETH in events) {
          this._controller.logger().info(`[COMMIT_RECEIPT] received ReceiptFailedETH event after committing compute task ${task.getTaskId()}`);
          if (isDelta) {
            this._controller.logger().info(`[COMMIT_RECEIPT] reverting state`);
            let res = await this._revertState(task, true);
            err = res.error;
          }
        }
      }
      catch (e) {
        this._controller.logger().info(`[COMMIT_RECEIPT] received an error while trying to commit compute task ${task.getTaskId()} error=${e}`);
        if (isDelta) {
          this._controller.logger().info(`[COMMIT_RECEIPT] reverting state`);
          let res = await this._revertState(task, true);
          err = res.error;
        }
      }
    }
    else {
      try {
        await this._controller.ethereum().api().commitTaskFailure(
          task.getContractAddr(),
          task.getTaskId(),
          task.getResult().getUsedGas(),
          task.getResult().getSignature(),
        );
      }
      catch (e) {
        this._controller.logger().info(`[COMMIT_RECEIPT] received an error while trying to commit failed compute task ${task.getTaskId()} error=${e}`);
        err = e;
      }
    }
    return {error: err};
  }

  async _revertState(task, isDeploy) {
    let coreMsg = {};
    let err = null;

    if (isDeploy) {
      coreMsg = {address: task.getContractAddr(), type: constants.CORE_REQUESTS.RemoveContract};
      this._controller.logger().debug(`[COMMIT_RECEIPT] reverting contract ${task.getContractAddr()}`);
    }
    else {
      let deltaKey = task.getResult().getDelta().key;
      coreMsg = {input: [{address: task.getContractAddr(), from: deltaKey, to: deltaKey+1}], type: constants.CORE_REQUESTS.RemoveContract};
      this._controller.logger().debug(`[COMMIT_RECEIPT] reverting delta ${deltaKey} of contract ${task.getContractAddr()}`);
    }
    try {
      await this._controller.asyncExecCmd(constants.NODE_NOTIFICATIONS.UPDATE_DB, {data: coreMsg});
    }
    catch (e) {
      this._controller.logger().error(`[COMMIT_RECEIPT] received an error while trying to revert core state: ${e}`);
      err = e;
    }
    return {error: err};
  }
}

module.exports = CommitReceiptAction;
