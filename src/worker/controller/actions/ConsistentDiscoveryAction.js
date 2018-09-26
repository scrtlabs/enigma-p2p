const constants = require('../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const StoppableTask = require('../../../common/StoppableTask');

class ConsistentDiscoveryAction{

    constructor(controller){
        this._controller = controller;
    }
    _getStoppableTaskOptions(options, taskInput){
        let final = {};

        let maxRetry = options.maxRetry;
        let delay = options.delay;
        let timeout = options.timeout;

        if(maxRetry){
            final.maxRetry = maxRetry;
        }
        if(delay){
            final.delay = delay;
        }
        if(timeout){
            final.timeout = timeout;
        }
        if(taskInput){
            final.taskInput = taskInput;
        }
        return final;
    }
    execute(params){

        // The results is == [{peerInfo,err,ping,pong},...]
        let options = this._getStoppableTaskOptions(params);

        let task = (stopper) =>{

            this._controller.connectionManager().tryConnect((err,results)=>{
                if(err){
                    if(err === STATUS.ERR_EMPTY_PEER_BANK){
                        console.log("EMPTY PEER BANK !!!!!!!!!!!!!!!!!!@@#$@!@$@#$%#@@#$%$$%");
                        // expand peer bank and retry
                        this._controller.connectionManager().expandPeerBank((err,info)=>{
                            if(err){
                                // some fatal error
                                stopper.done({"success" : false, "error" : err} , info);
                            }else{
                                stopper.done({"success" : false, "error" : "retryExpand"} , info);
                            }
                        });
                    }else{
                        // some fatal error
                        stopper.done({"success" : false, "error" : err} , results);
                    }
                }else{
                    // if True => stop
                    if(this._controller.connectionManager()._isOptimalDht()){
                        stopper.done({"success" : true} , {});
                    }else{
                        // repeat
                        stopper.done({"success" : false, "error" : "retryMoreConnections"} , {});
                    }
                }
            });
        };
        let onFinish = (status,result)=>{
            console.log("------------------- SUMMARY  ------------------");
            console.log("status => " , JSON.stringify(status,null,2));
            console.log("result => " , JSON.stringify(result,null,2));
            console.log("------------------- FINISHED STOPPABLE TASK ------------------");
        };

        let stopabbleTask = new StoppableTask(options,task,onFinish);

        stopabbleTask.start();
    }
}
module.exports = ConsistentDiscoveryAction;