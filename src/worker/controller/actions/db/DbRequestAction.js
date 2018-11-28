
const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require('../../../../main_controller/channels/Envelop');
/**
 This action returns all the tips
 either from cache or directly from core.
 * */
class DbRequestAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let onResponse = params.onResponse;
    let queryType = params.dbQueryType;
    let input = params.input;
    if(!this._validateRequest(queryType)){
      onResponse("invalid queryType");
      return;
    }
    let requestEnvelop = new Envelop(true
        ,{type : queryType, input : input}
        ,constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest);

    this._controller.communicator()
      .sendAndReceive(requestEnvelop)
      .then(responseEnvelop=>{
        let parsedResponse = responseEnvelop.content();
        onResponse(null,parsedResponse);
      });
  }
  _validateRequest(reqType){
    return (reqType in constants.CORE_REQUESTS);
  }
}
module.exports = DbRequestAction;
