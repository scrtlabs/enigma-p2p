const EventEmitter = require('events').EventEmitter;
class TaskManager extends EventEmitter{
  constructor() {
    super();
  }
  /**
   * add a task to the task queue, task can be both secret contract deployment or computation
   * the task is unconfirmed until Ethereum event will pop and then confirmTask(taskId) should be called.
   * @param {string} taskId
   * @param {TODO::Task} unconfirmedTask,
   * @param {Function} callback - once done.
   * */
  addUnconfirmedTaskToQueue(taskId,unconfirmedTask,callback){}
  /**
   * once a task request is confirmed on Ethereum
   * @param {string} taskId
   * */
  confirmTask(taskId){}
  /**
   * Task status can be:
   * - unconfirmed, waiting for confirmation from Ethereum
   * - pending, in the queue; didn't start yet in core
   * - started, passed to core
   * - finished_error, finished with error
   * - finished_pending_ethereum, finished but pending for Ethereum commit (has Ethereum callback)
   * - finished_success, finished with success
   *
   * @param {string} taskId
   * @return {string} status
   * */
  getTaskStatus(taskId){}
  /**
   * Get some task info
   * @param {string} taskId,
   * @return {TODO::Task} task
   * */
  getTask(taskId){}
  /**
   * remove some task from the queue or ignore when the result comes back if started
   * @param {string} taskId
   * */
  removeTask(taskId){}
  /**
   * get all pending tasks
   * @param {Array<TODO::Task>} pendingTasks
   * */
  getPendingTasks(){}
  /**
   * get the result of some task if done (i.e the return value of some function call in a secret contract)
   * @param {string} taskId
   * */
  getTaskResult(taskId){}
  /**
   * @param {string} taskId
   * @return {bool} true - has an Ethereum callback , false - no Ethereum callback
   * */
  isEthereumCallback(taskId){}
  /**
   * @param {Array<string>} taskIds , optional if null should commit all callbacks to Ethereum
   * i.e functions with a call to Ethereum
   * */
  commitEthereumCallbacks(taskIds){}
  /**
   * commit a batch of computations back to Ethereum to collect fee.
   * optional if null should commit all results to Ethereum
   * @param {Array<string>} tasksIds
   * */
  commitTasks(taskIds){}
}
module.exports = TaskManager;
