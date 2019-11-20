/**
 * Once the TaskManager emits FINISH_TASK
 * this action:
 * - publish the result to the results topic
 * - publish the result back to etherum
 * */
const constants = require("../../../../common/constants");
const DeployTask = require("../../../tasks/DeployTask");
const EngCid = require("../../../../common/EngCID");

class PublishTaskResultAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const task = params.task;
    let taskType;
    let err = null;

    if (task.isSuccess()) {
      taskType = task.getTaskType();
    } else {
      taskType = constants.CORE_REQUESTS.FailedTask;
    }

    this._controller.execCmd(constants.NODE_NOTIFICATIONS.PUBSUB_PUB, {
      topic: constants.PUBSUB_TOPICS.TASK_RESULTS,
      message: JSON.stringify({
        contractAddress: task.getContractAddr(),
        result: task.getResult().toDbJson(),
        type: taskType
      })
    });

    // commit to Ethereum
    if (this._controller.hasEthereum()) {
      err = await this._controller.asyncExecCmd(
        constants.NODE_NOTIFICATIONS.COMMIT_RECEIPT,
        {
          task: task
        }
      );
      if (err) {
        this._controller
          .logger()
          .info(
            `[PUBLISH_ANNOUNCE_TASK] error occurred in task ${task.getTaskId()} commit`
          );
      }
    }

    // announce as provider if its deployment and successful and no error occurred in task's commit
    if (task instanceof DeployTask && task.getResult().isSuccess() && !err) {
      //
      let ecid = EngCid.createFromSCAddress(task.getContractAddr());
      if (ecid) {
        try {
          await this._controller.asyncExecCmd(
            constants.NODE_NOTIFICATIONS.ANNOUNCE_ENG_CIDS,
            { engCids: [ecid] }
          );
        } catch (e) {
          this._controller
            .logger()
            .debug(`[PUBLISH_ANNOUNCE_TASK] cant publish  ecid ${e}`);
        }
      } else {
        this._controller
          .logger()
          .error(
            `[PUBLISH_ANNOUNCE_TASK] cant publish  ecid null ${task.getContractAddr()}`
          );
      }
    }
  }
}
module.exports = PublishTaskResultAction;
