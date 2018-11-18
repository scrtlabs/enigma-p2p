
const constants = require('../../../../common/constants');
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
      this._controller.execCmd(constants.NODE_NOTIFICATIONS.GET_ALL_ADDRS,{
        useCache : useCache,
        onResponse : (err,allAddrsResponse)=>{
          /**
           * do the announcement
           * */
          let parsedEngCids = allAddrsResponse.addresses.map(addr=>{
            let ecid = EngCid.createFromKeccack256(addr);
            if(ecid){
              return ecid;
            }else{
              console.log('[-] err converting bytearry->hex->EngCid !');
            }
          }).filter(ecid=>{return (ecid !== undefined && ecid !== null);});
          isEngCid = true;
          this._controller.provider().provideContentsBatch(parsedEngCids, isEngCid,(err, failedCids)=>{
            if(err){
              //TODO:: this is completley incorrect.
              //TODO:: it shows like there was some total error, but there will be errrors in the case where 1 peer logged out
              //TODO:: it will try to reconnect to him in the DHT and will throw an error
              //TODO:: this is ok accestable behaviour.
              //TODO:: the log below is missleading it says that there was a general error but that's no true, everything still works/
              //TODO:: Bottom line im not processing the errors in the correct way.
              console.log('[-] err %s couldnt provide at all. failed cids %s ', err, failedCids.length);
              onResponse(err,parsedEngCids);
            }else{
              console.log('[+] success providing cids. there are failed %s cids  ', failedCids.length);
              onResponse(null,parsedEngCids);
            }
          });
        }
      });
    }
  }
}
module.exports = AnnounceLocalStateAction;




