/**
 * verify a task
 * @TODO:: lena this is where the verify happens.
 * */
const ComputeTask = require('../../../tasks/ComputeTask');
const DeployTask = require('../../../tasks/DeployTask');
const taskTypes = require('../../../../common/constants').CORE_REQUESTS;

class VerifyNewTaskAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const unverifiedTask = params.task;
    // .........
    // let ethereumVerifier;
    // let isVerified = await ethereumVerifier.verify(task);
    //
    const isVerified = true;
    await this._controller.taskManager().asyncOnVerifyTask(unverifiedTask.getTaskId(), isVerified);
    // verify the task
  }
}
module.exports = VerifyNewTaskAction;
