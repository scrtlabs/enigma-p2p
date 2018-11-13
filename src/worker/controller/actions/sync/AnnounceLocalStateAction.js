
const constants = require('../../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const Envelop = require('../../../../main_controller/channels/Envelop');
const DbUtils = require('../../../../common/DbUtils');
const EngCid = require('../../../../common/EngCID');
/**
 * This Action announces to the network about it's local state
 * This should be called once the node is synched with the network and has all the deltas and contracts.
 * //TODO:: add flag to check if and only if NODE_IS_FULLY_SYNCED then allow otherwise dismiss the request
 * */
class AnnounceLocalStateAction{
  constructor(controller){
    this._controller = controller;
  }
  execute(params){
    let useCache = params.cache;
    let onResponse = params.onResponse;
    let isEngCid = params.isEngCid;

    if(useCache){
      this._controller.cache().getAllTips((err,tipsList)=>{
        //TODO:: implement cache logic
        //TODO:: if cache empty still query core since maybe it was deleted or first time
      });
    }else{
      let requestEnvelop = new Envelop(true
          ,{type : constants.CORE_REQUESTS.GetAllAddrs}
          ,constants.MAIN_CONTROLLER_NOTIFICATIONS.DbRequest);
      this._controller.communicator()
      .sendAndReceive(requestEnvelop)
      .then(responseEnvelop=>{
        /**
         * do the announcement
         * */
        let parsedEngCids = responseEnvelop.content().addresses.map(addr=>{
          let hexAddr = DbUtils.toHexString(addr);
          let ecid = EngCid.createFromKeccack256(hexAddr);
          if(ecid){
            return ecid;
          }else{
            console.log('[-] err converting bytearry->hex->EngCid !');
          }
        }).filter(ecid=>{return (ecid !== undefined && ecid !== null);});
        // because we parsed above to eng ecid
        isEngCid = true;
        this._controller.provider().provideContentsBatch(parsedEngCids, isEngCid,(err, failedCids)=>{
          if(err){
            console.log('[-] err %s couldnt provide at all. failed cids %s ', err, failedCids.length);
            onResponse(err,parsedEngCids);
          }else{
            console.log('[+] success providing cids. there are failed %s cids  ', failedCids.length);
            onResponse(null,parsedEngCids);
          }
        });
      });
    }
  }
}
module.exports = AnnounceLocalStateAction;




