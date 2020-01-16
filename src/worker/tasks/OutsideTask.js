const Task = require("./Task");
const Result = require("./Result").Result;

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
    return output;
  }
  static fromDbJson(taskObj) {
    if (taskObj.status) {
      const task = OutsideTask.buildTask(taskObj.type, taskObj.result);
      return task;
    }
    return null;
  }
}

module.exports = OutsideTask;
