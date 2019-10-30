/**
 * this action is called once a task is verified and now needs to be executed.
 * it checks whether PTT in progress, if so the task execution is delayed. If not, the task execution starts immediately.
 * */
const constants = require("../../../../common/constants");

class HandleVerifiedTaskAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    const task = params.task;

    const executeTaskCallback = () => {
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.EXEC_TASK, {
        task: task
      });
    };

    // First check if we are in the middle of PTT
    // if so, schedule the task execution to after it is done
    if (this._controller.principal().isInPTT()) {
      this._controller
        .principal()
        .once(constants.PTT_END_EVENT, executeTaskCallback);
    }
    // otherwise, execute task now
    else {
      executeTaskCallback();
    }
  }
}
module.exports = HandleVerifiedTaskAction;
