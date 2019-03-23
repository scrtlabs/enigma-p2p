class GetResultAction {
  constructor(controller) {
    this._controller = controller;
  }
  async execute(params) {
    let taskId = params.taskId;
    let task = await this._controller.taskManager().asyncGetTask(taskId);
    return task.getResult();
  }
  async asyncExecute(params){
    return this.execute(params);
  }
}
module.exports = GetResultAction;
