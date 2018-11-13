
const constants = require('../../../../common/constants');
const NODE_NOTIY = constants.NODE_NOTIFICATIONS;
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require('../../../../main_controller/channels/Envelop');
/**
 * This action is the first step to sync
 * this identifies the missing state the worker needs.
 * - it will use the cache or go directly to core.
 * - get the local tips
 * - get remote tips
 * - parse them into a format class "MissingStatesMap"
 * - and return the result to the caller.
 * */
class IdentifyMissingStatesAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let useCache = params.cache;
    let finalCallback = params.onResponse;
    if(useCache){
      this._controller.cache().getAllTips((err,tipsList)=>{
          //TODO:: implement cache logic
          //TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    }else{
      this._controller.execCmd(NODE_NOTIY.GET_ALL_TIPS,{
        cache : useCache,
        onResponse : (err,localTips)=>{
          //TODO:: go to ethereum and build the missingstate
          finalCallback(err,localTips);
        }
      })
    }
  }
}
module.exports = IdentifyMissingStatesAction;

