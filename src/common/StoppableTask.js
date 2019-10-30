class StoppableTask {
  constructor(options, task, onFinish) {
    this._timeout = null;
    this._maxRetry = null;
    this._taskInput = null;
    this._delay = 0;

    this._onFinish = onFinish;

    if (options.timeout) {
      this._timeout = options.timeout;
    }
    if (options.maxRetry) {
      this._maxRetry = options.maxRetry;
    }
    if (options.taskInput) {
      this._taskInput = options.taskInput;
    }

    if (options.delay) {
      this._delay = options.delay;
    }

    this._tryCount = -1;
    this._stop = false;
    this._task = task;
    this._timerId = null;
  }

  start() {
    if (this._timeout) {
      this._timerId = setTimeout(() => {
        this._stop = true;
      }, this._timeout);
    }

    if (this._tryCount > -1) {
      this._tryCount = 0;
    }

    this._execute();
  }
  _execute() {
    setTimeout(() => {
      if (this._taskInput) {
        this._task(this._taskInput, this);
      } else {
        this._task(this);
      }
    }, this._delay);
  }
  done(status, result) {
    if (status.success) {
      this._finish(status, result);
    } else {
      if (this._shouldStop()) {
        this._finish(status, result);
      } else {
        this._tryCount += 1;
        this._execute();
      }
    }
  }
  _finish(status, result) {
    clearTimeout(this._timerId);
    this._onFinish(status, result);
  }

  _shouldStop() {
    let shouldStop = false;

    if (this._maxRetry != null) {
      if (this._tryCount >= this._maxRetry) {
        shouldStop = true;
      }
    }

    return this._stop || shouldStop;
  }
}

module.exports = StoppableTask;

// let job = (params, stopper)=>{
//     console.log("i run " + params.val);
//     stopper.done({"success" : false} , 42);
// };
//
// let onFinish = (status, result)=>{
//     if(status.success){
//         console.log("yay success " + result);
//     }else{
//         console.log("failed!");
//     }
// };
//
// let task =  new StoppableTask({
//     "maxRetry" : 2,
//     "timeout" : 2000,
//     "taskInput" : {"val" : 11},
//     "delay" : 500,
// },job,onFinish);
//
// task.start();
