/**
 * This class is the final output from the IdentifyMissingStateAction.
 * it contains all the information about WHAT needs to be received from other peers
 * in the network.
 * */
const EngCid = require('../../../common/EngCID');
const SyncMsgBuilder = require('../../../policy/p2p_messages/sync_messages').SyncMsgBuilder;
const constants = require('../../../common/constants');

//TODO:: come to conclusion that this function is unnesceary and delete it.
//   /**
//    * add to this._missingList a another field `ecid`
//    * we need ecid to be attached and computed heer
//    * this ecid will be used to findproviders message
//    * //TODO:: assumption here about addresses, read the TODO inside the code block.
//    */
// function _addCids(missingList){
//   missingList.forEach(element=>{
//     //TODO:: assumption here is that the address is a keccack256 hash already
//     //TODO:: i.e saved like this both in db (as byte array) and in Enigma.sol
//     let address = element.address;
//     let ecid = EngCid.createFromKeccack256(address);
//     if(ecid){
//       element.ecid = ecid;
//     }
//   });
// }
/**
 * identify if the bytecode is missing and should be requested as well.
 * @param {JSON} contractData,
 * @return {Boolean} isBcodeRequest
 * */
function isBCodeRequest(contractData){
  return contractData.deltas[0].index === 0;
}
function sortAll(missingList){
    missingList.forEach(contractData=>{
      contractData.deltas.sort((d1,d2)=>{
        return d1.index - d2.index;
      });
    });
}
/**
 * parse requests into a SyncMsgBuilder format
 * @param {JSON} contractData , element of this._missingList
 * @return {Array<Json>} parsedReqs  ready for StateSyncBuilder
 * how each DELTA request should look like
 * let state_sync_req_obj = {
      contractAddress : '0x...',
      fromIndex: 1,
      toIndex : 101,
      fromHash : '0x...',
      toHash : '0x...'
    };
 * */
function parseStateReqMsgs(contractData){
  let parsedReqs = [];
  let deltas = contractData.deltas;
  let bucketSize = constants.CONTENT_ROUTING.RANGE_LIMIT;
  let totalAmount = deltas.length;
  let bucketsNum = Math.ceil((totalAmount / bucketSize));
  let begin = 0;
  for(let i=0;i<bucketsNum;++i){
    let end = Math.min(begin+bucketSize,totalAmount);
    let slice = deltas.slice(begin,end);
    // build request
    parsedReqs.push({
      contractAddress : contractData.address,
      fromIndex : slice[0].index,
      fromHash : slice[0].deltaHash,
      toIndex : slice[slice.length-1].index,
      toHash : slice[slice.length-1].deltaHash
    });
    begin = end;
  }
  return parsedReqs;
}
/**
 * this function handles all the building of a message request per contract
 * bcodeReq -> SyncBcodeReqMsg, deltasReq -> Array<SyncStateResMsg>.
 * @param {JSON} contractData , instance of this._missingList
 * @return {Function} callback , (err,res)=>{} // res = {bcodeReq,deltasReq}
 * */
function buildP2ReqPMsgsOneContract(contractData){
  let result = {};
  let reqMsgs = parseStateReqMsgs(contractData);
  result.deltasReq = SyncMsgBuilder.batchStateReqFromObjsNoValidation(reqMsgs);
  if(isBCodeRequest(contractData)){
    result.bcodeReq = SyncMsgBuilder.bCodeReqFromObjNoValidation({contractAddress : contractData.address});
  }
  return result;
}
/** create all the missing state messages according to the definitions of a message structure
 * @param {Array<JSON>} missingContent - [{address,deltas:[{deltaHash,index},...]},...]
 * @return (JSON} result
 * - result param definition:
 *  - EngCID.hash() => {bcodeReq: SyncBcodeReqMsg, deltasReq : [Array<SyncStateResMsg>]}
 * */
module.exports.createP2PReqMsgsMap = (missingList)=>{
  //* [{address,deltas:[{deltaHash,index},...]},...]
  //sortAll(missingList); TOOD:: lena: verify indeed that the list is already sorted
  let output = {};
  for(let i=0;i<missingList.length;++i){
    let reqMsgs = buildP2ReqPMsgsOneContract(missingList[i]);
    output[missingList[i].address] = reqMsgs;
  }
  return output;
};
