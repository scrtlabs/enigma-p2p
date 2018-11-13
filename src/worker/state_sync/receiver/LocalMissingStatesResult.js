/**
 * This class is the final output from the IdentifyMissingStateAction.
 * it contains all the information about WHAT needs to be received from other peers
 * in the network.
 * */
const EngCid = require('../../../common/EngCID');
const SyncMsgBuilder = require('../../../policy/p2p_messages/sync_messages').SyncMsgBuilder;
const constants = require('../../../common/constants');
const parallel = require('async/parallel');
const waterfall = require('async/waterfall');

class LocalMissingStatesResult{
  /**
   * @param {Array<JSON>} missingContent
   * [{address,deltas:[{deltaHash,index},...]},...]
   * */
  constructor(missingContent){
    this._missingList = missingContent;
    this._errorParsing = false;
    this._addCids();
    // initialized only the first time when getRangesMap() is called.
    this._rangesMap = {};
    this._isSorted = false;
  }
  /**
   * @return {Array<EngCid>}
   * */
  getEngCids(){
    return this._missingList.map(elem=>{
      return elem.ecid;
    });
  }
  /**
   * add to this._missingList a another field `ecid`
   * we need ecid to be attached and computed heer
   * this ecid will be used to findproviders message
   * //TODO:: assumption here about addresses, read the TODO inside the code block.
   */
  _addCids(){
    this._missingList.forEach(element=>{
      let address = element.address;
      //TODO:: assumption here is that the address is a keccack256 hash already
      //TODO:: i.e saved like this both in db (as byte array) and in Enigma.sol
      let ecid = EngCid.createFromKeccack256(address);
      if(ecid){
        element.ecid = ecid;
      }else{
        this._errorParsing = true;
      }
    });
  }
  isError(){
    return this._errorParsing;
  }
  /** get the eng cids only.
   * @return {Array<EngCid>}
   **/
  getEngCids(){
    return this._missingList.map(element=>{
      return element.ecid;
    });
  }
  /** create all the missing state messages according to the definitions of a message structure
   * @param (Function} callback , (err,result)=>{}
   * - callback result param definition:
   *  - EngCID.hash() => {bcodeReq: SyncBcodeReqMsg, deltasReq : [Array<SyncStateResMsg>]}
   * */
  buildP2ReqPMsgs(callback){
    //* [{address,deltas:[{deltaHash,index},...]},...]
    this._sortAll();
    let output = {};
    let jobs = [];
    // init jobs
    this._missingList.forEach(contractData=>{
      jobs.push(cb=>{
        this._buildP2ReqPMsgsOneContract(contractData,(err,result)=>{
          if(!err){
            output[contractData.ecid.getKeccack256()] = result;
          }else{
            console.log("[-] err in buildP2ReqPMsgs");
          }
          cb(err,result);
        });
      });
    });
    // execute jobs
    parallel(jobs,(err,allResults)=>{
      return callback(err,allResults);
    });
  }
  // buildP2ReqPMsgs(callback){
  //   //* [{address,deltas:[{deltaHash,index},...]},...]
  //   this._sortAll();
  //   let output = {};
  //   let jobs = [];
  //   // init jobs
  //   this._missingList.forEach(contractData=>{
  //     jobs.push(cb=>{
  //       this._buildP2ReqPMsgsOneContract(contractData,(err,result)=>{
  //         if(!err){
  //           output[contractData.ecid.getKeccack256()] = result;
  //         }else{
  //           console.log("[-] err in buildP2ReqPMsgs");
  //         }
  //         cb(err);
  //       });
  //     });
  //   });
  //   waterfall(jobs,(err)=>{
  //     return callback(err,output);
  //   });
  // }
  /**
   * this function handles all the building of a message request per contract
   * bcodeReq -> SyncBcodeReqMsg, deltasReq -> Array<SyncStateResMsg>.
   * @param {JSON} contractData , instance of this._missingList
   * @param {Function} callback , (err,res)=>{} // res = {bcodeReq,deltasReq}
   * */
  _buildP2ReqPMsgsOneContract(contractData,callback){
    let reqMsgs = this._parseStateReqMsgs(contractData);
    SyncMsgBuilder.batchStateReqFromObjs(reqMsgs,(err,parsedMsgs)=>{
      if(err){
        return callback(err);
      }
      if(this._isBCodeRequest(contractData)){
        SyncMsgBuilder.bCodeReqFromObj({contractAddress : contractData.address},
            (err,bCodeReq)=>{
              // BUG:: weird error here
              return callback(err,{bcodeReq:bCodeReq,deltasReq:parsedMsgs});
        });
      }else{
        return callback(err,{bcodeReq:null,deltasReq:parsedMsgs});
      }
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
  _parseStateReqMsgs(contractData){
    this._sortAll();
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
   * identify if the bytecode is missing and should be requested as well.
   * */
  _isBCodeRequest(contractData){
    this._sortAll();
    return contractData.deltas[0].index === 0;
  }
  /** used to get ranges for all contracts.
   * TODO:: this is heavy in performance
   * TODO:: it does sorting for each deltas array.
   * TODO:: so if there are N contracts and each contract has K delta's then:
   * TODO:: - sort 1 array of deltas = log(K)
   * TODO:: - for N contracts = N*log(k)
   * TODO:: HEAVY ON PREFORMANCE
   * @return {JSON} rangesMap
   * - rangesMap {
   *  someAddress => {fromIndex,toIndex,fromHash,toHash}
   * }
   * */
  getRangesMap(){
    if(Object.keys(this._rangesMap).length > 0){
      return this._rangesMap;
    }
    for(let i=0;i<this._missingList.length;++i){
      let range = this._calcRange(i);
      this._rangesMap[this._missingList[i].address] = range;
    }
    return this._rangesMap;
  }
  _sortAll(){
    if(!this._isSorted){
      this._missingList.forEach(contractData=>{
        contractData.deltas.sort((d1,d2)=>{
          return d1.index - d2.index;
        });
      });
      this._isSorted = true;
    }
  }
  _calcRange(index){
    if(index >= this._missingList.length || index < 0 || this._missingList.length === 0){
      return null;
    }
    let scDeltas = this._missingList[index].deltas;
    this._sortAll();
    return {
      address   : this._missingList[index].address,
      fromIndex : scDeltas[0].index,
      fromHash  : scDeltas[0].deltaHash,
      toIndex   :  scDeltas[scDeltas.length-1].index,
      toHash    : scDeltas[scDeltas.length-1].deltaHash,
    };
  }
}
module.exports = LocalMissingStatesResult;
// /** mini test */
//* [{address,deltas:[{deltaHash,index},...]},...]
// let raw = [];
// for(let i =0;i<3;++i){
//   let res ={
//     address : ('0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac' + i),
//     deltas : []
//   };
//   for(let i=0;i<3;++i){
//     res.deltas.push({
//       deltaHash: '0x54663e7b6238f5c40596b0' + i,
//       index : i
//     });
//   }
//   raw.push(res);
// }
//
// let missingStates = new LocalMissingStatesResult(raw);
// let map = missingStates.getRangesMap();
// console.log(map);
// let ecids = missingStates.getEngCids();
// ecids.forEach(ecid=>{
//   console.log(ecid.getKeccack256());
// })
