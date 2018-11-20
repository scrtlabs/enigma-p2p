const constants = require('../../../../common/constants');
const NODE_NOTIFY = constants.NODE_NOTIFICATIONS;
const waterfall = require('async/waterfall');

/**
 * RECEIVER SIDE
 * Q: What does it do?
 * A: sync all the contracts/deltas from identifying what's missing to saving it back to db
 *
 * This runs several actions which is why it is a pipeline.
 *
 * */
class ReceiveAllPipelineAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){

    let cache = params.cache;
    waterfall([
        cb=>{
          this._controller.execCmd(NODE_NOTIFY.IDENTIFY_MISSING_STATES_FROM_REMOTE,{
            cache : cache,
            onResponse : (err , missingStatesMsgsMap)=>{
              cb(err,missingStatesMsgsMap);
            }
          });
        },
      (err,missingStatesMsgsMap,cb)=>{

      },
    ],(err,result)=>{

    });


}
module.exports = ReceiveAllPipelineAction;

