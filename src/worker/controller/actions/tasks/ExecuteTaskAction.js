/**
 * this action is called once a task is verified and now needs to be executed.
 * it builds and passes a request to core through the ipc.
 * then, it responds with the result back to the task manager.
 * */
const Result = require('../../../tasks/Result');
const constants = require('../../../../common/constants');
const taskTypes = constants.CORE_REQUESTS;
const Envelop = require('../../../../main_controller/channels/Envelop');
const DeployTask = require('../../../../worker/tasks/DeployTask');


class ExecuteTaskAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const task = params.task;

    // If this is a deploy task, trigger PTT for the specific contract address
    if (task instanceof DeployTask) {
      try {
        await this._controller.asyncExecCmd(
          constants.NODE_NOTIFICATIONS.GET_STATE_KEYS,
          {
            addresses: [task.getContractAddr()],
            blockNumber: task.getBlockNumber()
          });
        this._controller.logger().debug(`finished GET_STATE_KEYS for ${task.getTaskId()}`);
      } catch (e) {
        return this._controller.logger().error(`received an error while trying to GET_STATE_KEYS for ${task.getTaskId()}: ${e}`);
      }
    }

    const requestEnv = new Envelop(true, {
      type: task.getTaskType(),
      input: task.toCoreJson(),
    }, constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest);
    let responseEnvelop = null;
    try {
      responseEnvelop = await this._controller.communicator().sendAndReceive(requestEnv);
    } catch (e) {
      return this._controller.logger().error(e);
    }
    const response = responseEnvelop.content();
    // check for system error
    if (response.msg) {
      // TODO:: what happens to the stored task? its still IN-PROGRESS state in the task manager.
      return this._controller.logger().error('response from Core' + JSON.stringify(response));
    }
    let result = null;
    if (response.result) {
      response.result.taskId = task.getTaskId();
    }
    switch (response.type) {
      case taskTypes.FailedTask:
        response.result.status = constants.TASK_STATUS.FAILED;
        result = Result.FailedResult.buildFailedResult(response.result);
        break;
      case taskTypes.DeploySecretContract:
        response.result.status = constants.TASK_STATUS.SUCCESS;
        result = Result.DeployResult.buildDeployResult(response.result);
        break;
      case taskTypes.ComputeTask:
        response.result.status = constants.TASK_STATUS.SUCCESS;
        result = Result.ComputeResult.buildComputeResult(response.result);
        break;
    }
    // update task manager with the result
    if (result) {
      try {
        await this._controller.taskManager().asyncOnFinishTask(result);
      } catch (e) {
        this._controller.logger().error(e);
      }
    } else {
      this._controller.logger().error('failed building Result from Task');
    }
  }
}
module.exports = ExecuteTaskAction;
