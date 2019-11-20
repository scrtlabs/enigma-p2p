const Task = require("./Task");
const Result = require("./Result").Result;
const nodeUtils = require("../../common/utils");

class OutsideTask extends Task {
  constructor(taskId, type, result) {
    super(taskId, type);
    // set task status
    this.setResult(result);
  }
  static buildTask(type, rawResult) {
    let result = Result.buildFromRaw(type, rawResult);
    if (result) {
      return new OutsideTask(result.getTaskId(), type, result);
    }
    return null;
  }
  toDbJson() {
    let output = {
      outsideTask: true,
      status: this.getResult().getStatus(),
      type: this.getTaskType(),
      taskId: this.getTaskId(),
      result: this.getResult().toDbJson()
    };
    return JSON.stringify(output);
  }
  static fromDbJson(taskObj) {
    if (taskObj.status) {
      if (taskObj.result && nodeUtils.isString(taskObj.result)) {
        taskObj.result = JSON.parse(taskObj.result);
      }
      const task = OutsideTask.buildTask(taskObj.type, taskObj.result);
      return task;
    }
    return null;
  }
}

module.exports = OutsideTask;
