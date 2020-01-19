const errors = require("../../common/errors");
const DbApi = require("../../db/LevelDbApi");
const constants = require("../../common/constants");
const path = require("path");
const Task = require("./Task");
const EventEmitter = require("events").EventEmitter;
const nodeUtils = require("../../common/utils");
const DeployTask = require("./DeployTask");
const ComputeTask = require("./ComputeTask");
const OutsideTask = require("./OutsideTask");
const Result = require("./Result");

class TaskManager extends EventEmitter {
  constructor(dbPath, logger) {
    super();
    this._logger = logger;
    if (dbPath) {
      this._dbPath = dbPath;
    } else {
      this._dbPath = path.join(__dirname, "/tasks_db");
    }
    this._db = new DbApi(this._dbPath, logger);
    this._db.open();
    /**
     * Map of unverified tasks in memory
     * taskId => {time:unixTimestam,task:Task} (unverified status)
     * */
    this._unverifiedPool = {};
  }
  /**
   * add a new task to the unverified (in-memory) pool.
   * @param {Task} unverifiedTask
   * */
  addTaskUnverified(unverifiedTask) {
    const err = null;
    if (this._isOkToAdd(unverifiedTask)) {
      // add to pool
      this._unverifiedPool[unverifiedTask.getTaskId()] = {
        time: nodeUtils.unixTimestamp(),
        task: unverifiedTask
      };
      this.notify({
        notification: constants.NODE_NOTIFICATIONS.VERIFY_NEW_TASK,
        task: unverifiedTask
      });
    } else {
      const err = "TaskManager: Task is not not ok to add";
      this._logger.error(err);
    }
    return err;
  }
  /**
   * store a result of a task computed by OTHER worker from the network.
   * used to serve other for queries of type "getResult by taskId" since core does not save anything related to task Id.
   * @param {OutsideTask} outsideTask
   * @return {Promise<true>} if succeeded otherwise throws.
   * */
  addOutsideResult(type, outsideTask) {
    return new Promise((res, rej) => {
      if (outsideTask instanceof OutsideTask) {
        this._db.put(outsideTask.getTaskId(), this._serializeTask(outsideTask), err => {
          if (err) {
            return rej(err);
          }
          res(true);
        });
      } else {
        rej(new errors.TypeErr(`result is not instanceof OutsideTask`));
      }
    });
  }
  /**
   * Save a task into the db
   * @param {DeployTask/ComputeTask} task,
   * @param {Function} callback (err)=>{}
   * */
  _storeTask(task, callback) {
    // store the new task
    this._db.put(task.getTaskId(), this._serializeTask(task), callback);
  }
  /**
   * Promise based removeTask
   * */
  async asyncRemoveTask(taskId) {
    return new Promise((resolve, reject) => {
      this.removeTask(taskId, err => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }
  /**
   * delete a Task
   * @param {string} taskId
   * @param {Function} callback(err)=>{};
   * */
  removeTask(taskId, callback) {
    if (this._unverifiedPool[taskId]) {
      delete this._unverifiedPool[taskId];
      this._logger.debug("[UNVERIFIED-DELETE] task " + taskId + "deleted");
    }
    this._deleteTask(taskId, err => {
      if (err) {
        this._logger.error("[_delete]: " + err);
      }
      callback(err);
    });
  }
  /**
   * get all tasks with future
   * @return {Promise<Array<Task>>}
   * */
  async asyncGetAllTasks() {
    return new Promise((resolve, reject) => {
      this.getAllTasks((err, tasks) => {
        if (err) reject(err);
        else resolve(tasks);
      });
    });
  }
  /**
   * get all tasks
   * @param {Function} callback(err,Array<Task>)=>{}
   * */
  getAllTasks(callback) {
    const allTasks = [];
    const keys = Object.keys(this._unverifiedPool);
    // add all unverified tasks
    keys.forEach(key => {
      allTasks.push(this._unverifiedPool[key].task);
    });
    // add all db tasks
    this._getAllDbTasks((err, tasks) => {
      if (err instanceof Error && err.type === "NotFoundError") {
        return callback(null, allTasks);
      } else if (err) {
        return callback(err);
      } else {
        return callback(null, allTasks.concat(tasks));
      }
    });
  }
  /**
   * promise based version of getTask
   * */
  async asyncGetTask(taskId) {
    return new Promise((res, rej) => {
      this.getTask(taskId, (err, task) => {
        if (err) {
          return rej(err);
        }
        res(task);
      });
    });
  }
  /**
   * get task
   * @param {Function} callback(err,Task)=>{}
   * */
  getTask(taskId, callback) {
    if (this.isUnverifiedInPool(taskId)) {
      return this._unverifiedPool[taskId].task;
    }
    this._readTask(taskId, (err, task) => {
      callback(err, task);
    });
  }
  /**
   * Check the Task status
   * @param {string} taskId
   * @return {Function} callback(status or null)
   * */
  getTaskStatus(taskId, callback) {
    this.getTask(taskId, (err, task) => {
      if (err) return callback(null);
      else callback(task.getStatus());
    });
  }
  /**
   * returns all the tasks from the pull
   * @return {Array<Task>} unverifiedTasks
   * */
  getUnverifiedTasks() {
    const taskIds = Object.keys(this._unverifiedPool);
    return taskIds.map(id => {
      return this._unverifiedPool[id].task;
    });
  }
  /**
   * get all verified tasks (in-progress or finished)
   * @return {Array<Task>} verifiedTasks
   * */
  async asyncGetVerifiedTasks() {
    return new Promise((res, rej) => {
      this._getAllDbTasks((err, verifiedTasks) => {
        if (err) rej(err);
        else res(verifiedTasks);
      });
    });
  }
  /**
   * get all tasks that are finished in FAILED status
   * @return {Array<Task>} failedTasks
   * */
  async asyncGetFailedTasks() {
    return new Promise(async (res, rej) => {
      try {
        const finished = await this.asyncGetFinishedTasks();
        const failed = finished.filter(t => {
          return t.isFailed();
        });
        res(failed);
      } catch (e) {
        rej(e);
      }
    });
  }
  /**
   * get all tasks that are finished in SUCCESS status
   * @return {Array<Task>} finishedTasks
   * */
  async asyncGetSuccessfullTasks() {
    return new Promise(async (res, rej) => {
      try {
        const finished = await this.asyncGetFinishedTasks();
        const successfull = finished.filter(t => {
          return t.isSuccess();
        });
        res(successfull);
      } catch (e) {
        rej(e);
      }
    });
  }
  /**
   * get all tasks that are finished (success or failed)
   * @return {Array<Task>} finishedTasks
   * */
  async asyncGetFinishedTasks() {
    return new Promise((res, rej) => {
      this._getAllDbTasks((err, verifiedTasks) => {
        if (err) {
          rej(err);
        } else {
          const finishedTasks = verifiedTasks.filter(t => {
            return t.isFinished();
          });
          res(finishedTasks);
        }
      });
    });
  }
  /**
   * promise based version of onFinishTask
   * */
  async asyncOnFinishTask(taskResult) {
    return new Promise((res, rej) => {
      this.onFinishTask(taskResult, err => {
        if (err) rej(err);
        else res();
      });
    });
  }
  /**
   * promise based version of onFinishTask
   * */
  async asyncGetTaskStatus(taskId) {
    return new Promise((res, rej) => {
      this.getTask(taskId, (err, task) => {
        if (err) rej(err);
        else res(task.getStatus());
      });
    });
  }
  /**
   * callback by an action that finished computation
   * update db
   * notify
   * @param {Result} taskResult
   * @param {Function} callback (err)=>{}
   */
  onFinishTask(taskResult, callback) {
    // this should never happen.
    if (this._unverifiedPool[taskResult.getTaskId()]) {
      const err = "[ON_FINISH_TASK] error task " + taskResult.getTaskId() + " was executed without verification.";
      this._logger.error(err);
      return callback(err);
    }
    const id = taskResult.getTaskId();
    this._readTask(id, (err, task) => {
      if (err) {
        return callback(err);
      }
      this._deleteTask(id, err => {
        if (err) {
          return callback(err);
        }
        // attach a result
        task.setResult(taskResult);
        // save the task again with the result attached
        this._storeTask(task, err => {
          if (err) {
            return callback(err);
          }
          this._logger.info("[TASK_FINISHED] status = [" + taskResult.getStatus() + "] id: " + task.getTaskId());
          // notify about the task change
          this.notify({
            notification: constants.NODE_NOTIFICATIONS.TASK_FINISHED,
            task
          });
          return callback(null);
        });
      });
    });
  }
  /** *
   * promise based version of onVerifyTask
   */
  async asyncOnVerifyTask(taskId, isVerified) {
    return new Promise((res, rej) => {
      this.onVerifyTask(taskId, isVerified, err => {
        if (err) rej(err);
        else res();
      });
    });
  }
  /**
   * callback by an action that verified a task
   * - change the task status
   * - clean from unverified pool
   * - save to db
   * - notify (pass to core)
   * */
  onVerifyTask(taskId, isVerified, optionalCb) {
    if (!this.isUnverifiedInPool(taskId)) {
      this._logger.debug("[VERIFY:] task " + taskId + " not in pool.");
      if (optionalCb) return optionalCb(null);
      return;
    }
    if (!isVerified) {
      this._logger.debug("[VERIFY:] task " + taskId + " not verified");
      if (optionalCb) return optionalCb(null);
      return;
    }
    const task = this._unverifiedPool[taskId].task;
    task.setInProgressStatus();
    this._storeTask(task, err => {
      if (err) {
        this._logger.error("db error saving verified task to db" + err);
        if (optionalCb) optionalCb(err);
        return;
      }
      delete this._unverifiedPool[task.getTaskId()];
      this._logger.debug("[onVerifyTask] saved to db task " + task.getTaskId());
      this.notify({
        notification: constants.NODE_NOTIFICATIONS.TASK_VERIFIED,
        task: task
      });
      if (optionalCb) return optionalCb(null);
    });
  }
  /** check if task is in unverified explicitly and in pool */
  isUnverifiedInPool(taskId) {
    return this._unverifiedPool[taskId] && true;
    // return (this._unverifiedPool[taskId] && this._unverifiedPool[taskId].task.isUnverified());
  }
  /**
   * 24 hours currently
   * check if the TTL is still ok
   * i.e if false, then task can be overiden or removed
   * */
  isKeepAlive(taskId) {
    const now = nodeUtils.unixTimestamp();
    return this._unverifiedPool[taskId] && now - this._unverifiedPool[taskId].time < nodeUtils.unixDay();
  }
  /**
   * Promise based version of async
   * */
  async asyncStop() {
    return new Promise((res, rej) => {
      this.stop(err => {
        if (err) rej(err);
        else res();
      });
    });
  }
  /**
   * TODO:: !!!! USED FOR TESTS ONLY !!!!
   * stop and delete the db
   * TODO:: !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
   * */
  async asyncStopAndDropDb() {
    return new Promise(async (res, rej) => {
      try {
        await this.asyncStop();
        nodeUtils.deleteFolderFromOSRecursive(this._dbPath, () => {
          res();
        });
      } catch (e) {
        this._logger.error(e);
        rej(e);
      }
    });
  }
  /** stop the task manager
   * @param {Function} callback(err)=>{}
   * */
  stop(callback) {
    this._db.close(err => {
      callback(err);
    });
  }
  /**
   * Notify observer (Some controller subscribed)
   * @param {Json} params, MUTS CONTAINT notification field
   */
  notify(params) {
    this.emit("notify", params);
  }
  /**
   * Load a task from the db
   * @param {string} taskId
   * @param {Function} callback (err,Task)=>{}
   * */
  _readTask(taskId, callback) {
    this._db.get(taskId, (err, res) => {
      if (err) return callback(err);
      let task = this._deserializeTask(res);
      if (task) {
        callback(null, task);
      } else {
        return callback("error loading task from db");
      }
    });
  }

  /**
   * read and delete task from db
   * @param {string} taskId
   * @param {Function} callback (err)=>{}
   * */
  _deleteTask(taskId, callback) {
    // delete the task object
    this._db.delete(taskId, err => {
      return callback(err);
    });
  }

  /** get all the tasks from db
   * @{Function} callback(err,Array<Task>)=>{}
   * */
  _getAllDbTasks(callback) {
    this._db.getAll((err, taskMap) => {
      if (err) return callback(err);
      const taskList = [];
      for (const id in taskMap) {
        taskList.push(this._deserializeTask(taskMap[id]));
      }
      callback(null, taskList);
    });
  }
  /**
   * validation if its ok to add the task to the unverifiedPool
   * checks:
   * - if instance of Task
   * AND
   * - if not existing
   * */
  _isOkToAdd(unverifiedTask) {
    return unverifiedTask instanceof Task && !this.isUnverifiedInPool(unverifiedTask.getTaskId());
  }
  _serializeTask(task) {
    return JSON.stringify(task.toDbJson());
  }
  _deserializeTask(string) {
    const taskJson = JSON.parse(string);
    let task = null;
    //OutsideTask result received from outside node
    if (taskJson.outsideTask) {
      task = OutsideTask.fromDbJson(taskJson);
    }
    // deploy task
    else if (taskJson.preCode) {
      task = DeployTask.fromDbJson(taskJson);
    } else {
      task = ComputeTask.fromDbJson(taskJson);
    }
    return task;
  }
}

module.exports = TaskManager;
