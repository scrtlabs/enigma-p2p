/**
 * This class is the final output from the IdentifyMissingStateAction.
 * it contains all the information about WHAT needs to be received from other peers
 * in the network.
 * */
const EngCid = require('../../../common/EngCID');

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
  _calcRange(index){
    if(index >= this._missingList.length || index < 0 || this._missingList.length === 0){
      return null;
    }
    let scDeltas = this._missingList[index].deltas;
    scDeltas.sort((d1,d2)=>{
      return d1.index - d2.index;
    });
    return {
      address   : this._missingList[index].address,
      fromIndex : scDeltas[0].index,
      fromHash  : scDeltas[0].deltaHash,
      toIndex   :  scDeltas[scDeltas.length-1].index,
      toHash    : scDeltas[scDeltas.length-1].deltaHash,
    };
  }
}

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
