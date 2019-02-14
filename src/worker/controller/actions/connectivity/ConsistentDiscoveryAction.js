const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const StoppableTask = require('../../../../common/StoppableTask');

class ConsistentDiscoveryAction {
  constructor(controller) {
    this._controller = controller;
  }
  _getStoppableTaskOptions(options, taskInput) {
    const final = {};

    const maxRetry = options.maxRetry;
    const delay = options.delay;
    const timeout = options.timeout;
    const callback = options.callback;

    if (maxRetry) {
      final.maxRetry = maxRetry;
    }
    if (delay) {
      final.delay = delay;
    }
    if (timeout) {
      final.timeout = timeout;
    }
    if (taskInput) {
      final.taskInput = taskInput;
    }
    if (callback) {
      final.callback = callback;
    }
    return final;
  }
  execute(params) {
    // The results is == [{peerInfo,err,ping,pong},...]
    const options = this._getStoppableTaskOptions(params);

    const task = (stopper) =>{
      // flag process start
      this._controller.connectionManager().onStartPersistentDiscovery();

      this._controller.connectionManager().tryConnect((err, results)=>{
        if (err) {
          if (err === STATUS.ERR_EMPTY_PEER_BANK) {
            console.log('[-] EMPTY PEER BANK');
            // expand peer bank and retry
            this._controller.connectionManager().expandPeerBank((err, info)=>{
              if (err) {
                // some fatal error
                stopper.done({'success': false, 'error': err}, info);
              } else {
                stopper.done({'success': false, 'error': 'retryExpand'}, info);
              }
            });
          } else {
            // some fatal error
            stopper.done({'success': false, 'error': err}, results);
          }
        } else {
          // if True => stop
          if (this._controller.connectionManager()._isOptimalDht()) {
            stopper.done({'success': true}, {});
          } else {
            // repeat
            stopper.done({'success': false, 'error': 'retryMoreConnections'}, {});
          }
        }
      });
    };
    const onFinish = (status, result)=>{
      console.log('------------------- SUMMARY  ------------------');
      console.log('status => ', JSON.stringify(status, null, 2));
      console.log('result => ', JSON.stringify(result, null, 2));
      console.log('------------------- FINISHED STOPPABLE TASK ------------------');

      if (options.callback) {
        options.callback(status, result);
      }

      this._controller.connectionManager().onDonePersistentDiscovery(status, result);
    };

    const stopabbleTask = new StoppableTask(options, task, onFinish);

    stopabbleTask.start();
  }
}
module.exports = ConsistentDiscoveryAction;
