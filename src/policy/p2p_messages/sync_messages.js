const constants = require('../../common/constants');
const MSG_TYPES = constants.P2P_MESSAGES;
const schemeValidator = require('./schemes/SchemeValidator');
const EncoderUtil = require('../../common/EncoderUtil');
const waterfall = require('async/waterfall');
const EngCid = require('../../common/EngCID');

class SyncMsgBuilder {
  /** no validation test */
  static msgResFromObjNoValidation(msgObj){
    if(msgObj.hasOwnProperty('msgType')){
      switch(msgObj.msgType){
        case MSG_TYPES.SYNC_STATE_RES:
          return SyncMsgBuilder.stateResFromObjNoValidation(msgObj);
        case MSG_TYPES.SYNC_BCODE_RES:
          return SyncMsgBuilder.bcodeResFromObjNoValidation(msgObj);
      }
    }
    return null;
  }
  static stateResFromObjNoValidation(msgObj){
    return new SyncStateResMsg(msgObj);
  }
  static bcodeResFromObjNoValidation(msgObj){
    return new SyncBcodeResMsg(msgObj);
  }

  static msgReqFromObjNoValidation(msgObj){
    if(msgObj.hasOwnProperty('msgType')){
      switch(msgObj.msgType){
        case MSG_TYPES.SYNC_STATE_REQ:
          return SyncMsgBuilder.stateReqFromObjNoValidation(msgObj);
        case MSG_TYPES.SYNC_BCODE_REQ:
          return SyncMsgBuilder.bCodeReqFromObjNoValidation(msgObj);
      }
    }
    return null;
  }
  static batchStateReqFromObjsNoValidation(msgsObjList){
    return msgsObjList.map(m=>{
      m.msgType = MSG_TYPES.SYNC_STATE_REQ;
      return new SyncStateReqMsg(m);
    });
  }
  static stateReqFromObjNoValidation(msgObj){
    msgObj.msgType = MSG_TYPES.SYNC_STATE_REQ;
    return new SyncStateReqMsg(msgObj);
  }
  static bCodeReqFromObjNoValidation(msgObj){
    msgObj.msgType = MSG_TYPES.SYNC_BCODE_REQ;
    return new SyncBcodeReqMsg(msgObj);
  }
  static stateReqFromNetworkNoValidation(stateReqRaw){
    let reqObj = SyncMsgBuilder._parseFromNetwork(stateReqRaw);
    return SyncMsgBuilder.stateReqFromObjNoValidation(reqObj);
  }
  static bCodeFromNetworkNoValidation(stateReqRaw){
    let reqObj = SyncMsgBuilder._parseFromNetwork(stateReqRaw);
    return SyncMsgBuilder.bCodeReqFromObjNoValidation(reqObj);
  }
  /** no validation test */
  /**
     * from network stream
     * @param {Array<Integer>} networkMsg , a StateSyncReq msg
     * @param {Function} callback, (err,SyncStateReqMsg)=>{}
     * */
  static stateReqFromNetwork(networkMsg, callback) {
    const obj = SyncMsgBuilder._parseFromNetwork(networkMsg);
    if (obj) {
      SyncMsgBuilder.stateReqFromObj(obj, callback);
    } else {
      callback('error decoded network msg');
    }
  }
  static stateResFromNetwork(networkMsg, callback) {
    const obj = SyncMsgBuilder._parseFromNetwork(networkMsg);
    if (obj) {
      SyncMsgBuilder.stateResFromObj(obj, callback);
    } else {
      callback('error decoded network msg');
    }
  }
  static _parseFromNetwork(networkMsg) {
    const decoded = EncoderUtil.decode(networkMsg);
    return JSON.parse(decoded);
  }
  /**
     * from regular object in the code (JSON)
     * @param {Json} msgObj , a StateSyncReq msg
     * @param {Function} callback, (err,SyncStateReqMsg)=>{}
     * */
  static stateReqFromObj(msgObj, callback) {
    msgObj.msgType = MSG_TYPES.SYNC_BCODE_REQ;
    SyncMsgBuilder._buildMsg(MSG_TYPES.SYNC_STATE_REQ, msgObj, (err, message)=>{
      callback(err, message);
    });
  }
  static stateResFromObj(msgObj, callback) {
    msgObj.msgType = MSG_TYPES.SYNC_STATE_RES;
    SyncMsgBuilder._buildMsg(MSG_TYPES.SYNC_STATE_RES, msgObj, (err, message)=>{
      callback(err, message);
    });
  }
  static batchStateReqFromObjs(msgsObjList,callback){
    if(msgsObjList.length < 1){
      return callback("empty msg list");
    }
    let jobs = [];
    // init first jobs
    jobs.push(cb=>{
      SyncMsgBuilder.stateReqFromObj(msgsObjList[0], (err,msg)=>{
        if(err){
          return cb(err);
        }else{
          let results = [];
          results.push(msg);
          return cb(err,results);
        }
      });
    });
    // init rest of the jobs
    for(let i=1;i<msgsObjList.length;i++){
      jobs.push((results,cb)=>{
        SyncMsgBuilder.stateReqFromObj(msgs[i], (err,msg)=>{
          if(err){
            return cb(err);
          }else{
            results.push(msg);
            return cb(err,results);
          }
        });
      });
    }
    // execute jobs
    waterfall(jobs,(err,results)=>{
      return callback(err,results);
    });
  }
  static bCodeReqFromNetwork(networkMsg, callback) {
    const obj = SyncMsgBuilder._parseFromNetwork(networkMsg);
    if (obj) {
      SyncMsgBuilder.bCodeReqFromObj(obj, callback);
    } else {
      callback('error decoded network msg');
    }
  }
  static bCodeReqFromObj(msgObj, callback) {
    msgObj.msgType = MSG_TYPES.SYNC_BCODE_REQ;
    SyncMsgBuilder._buildMsg(MSG_TYPES.SYNC_BCODE_REQ, msgObj, (err, message)=>{
      if(err){
        return callback(err);
      }else{
        return callback(null, message);
      }
    });
  }
  static bCodeResFromNetwork(networkMsg, callback) {
    const obj = SyncMsgBuilder._parseFromNetwork(networkMsg);
    if (obj) {
      SyncMsgBuilder.bCodeResFromObj(obj, callback);
    } else {
      callback('error decoded network msg');
    }
  }
  static bCodeResFromObj(msgObj, callback) {
    msgObj.msgType = MSG_TYPES.SYNC_BCODE_RES;
    SyncMsgBuilder._buildMsg(MSG_TYPES.SYNC_BCODE_RES, msgObj, (err, message)=>{
      callback(err, message);
    });
  }
  static _isValidScheme(schemeType, testedObj, callback) {
    schemeValidator.validateScheme(testedObj, schemeType, callback);
  }
  static _buildMsg(msgType, msgObj, callback) {
    SyncMsgBuilder._isValidScheme(msgType, msgObj, (err, isValid)=>{
      if (err) {
        return callback(err);
      } else {
        if (isValid) {
          switch (msgType) {
            case MSG_TYPES.SYNC_STATE_REQ:
              callback(null, new SyncStateReqMsg(msgObj));
              break;
            case MSG_TYPES.SYNC_STATE_RES:
              callback(null, new SyncStateResMsg(msgObj));
              break;
            case MSG_TYPES.SYNC_BCODE_REQ:
              callback(null, new SyncBcodeReqMsg(msgObj));
              break;
            case MSG_TYPES.SYNC_BCODE_RES:
              callback(null, new SyncBcodeResMsg(msgObj));
              break;
          }
        } else {
          callback('invalid scheme');
        }
      }
    });
  }
}

class SyncMsg {
  constructor(rawMsg){
    this._rawMsg = rawMsg;
  }
  type(){
    return this._rawMsg.msgType;
  }
  toJSON(){
    return JSON.stringify(this._rawMsg);
  }
  toPrettyJSON(){
    return JSON.stringify(this._rawMsg, null, 2);
  }
  /** before sending to network;
     * @return {Array<Integer>} encoded and seriallized msgpack array of the msg*/
  toNetwork(){
    const msg = this.toJSON();
    return EncoderUtil.encode(msg);
  }
}

/**
 * A Message request representing the range of deltas required.
 * */
class SyncStateReqMsg extends SyncMsg {
  constructor(rawMsg) {
    super(rawMsg);
  }
  contractAddress() {
    return this._rawMsg.contractAddress;
  }
  getRange() {
    return {
      fromIndex: this.fromIndex(),
      fromHash: this.fromHash(),
      toIndex: this.toIndex(),
      toHash: this.toHash(),
    };
  }
  fromIndex() {
    return this._rawMsg.fromIndex;
  }
  fromHash() {
    return this._rawMsg.fromHash;
  }
  toHash() {
    return this._rawMsg.toHash;
  }
  toIndex() {
    return this._rawMsg.toIndex;
  }
}

/**
 * A Message response to a state sync request of deltas
 * */
class SyncStateResMsg extends SyncMsg {
  constructor(rawMsg) {
    super(rawMsg);
  }
  contractAddress() {
    return this._rawMsg.contractAddress;
  }
  states() {
    return this._rawMsg.states;
  }
  state(index) {
    if (index < this.states().length) {
      return this.states()[index];
    }
  }
  sortStates() {
    this.states().sort((d1, d2)=>{
      return d1.index - d2.index;
    });
    return this.states();
  }
}

class SyncBcodeReqMsg extends SyncMsg {
  constructor(rawMsg) {
    super(rawMsg);
  }
  contractAddress() {
    return this._rawMsg.contractAddress;
  }
}

class SyncBcodeResMsg extends SyncMsg {
  constructor(rawMsg) {
    super(rawMsg);
  }
  contractAddress() {
    return this._rawMsg.contractAddress;
  }
  deployedBytecode() {
    return this._rawMsg.deployedBytecode;
  }
}


module.exports.SyncStateResMsg = SyncStateResMsg;
module.exports.SyncStateReqMsg = SyncStateReqMsg;
module.exports.SyncMsgBuilder = SyncMsgBuilder;
module.exports.SyncBcodeReqMsg = SyncBcodeReqMsg;
module.exports.SyncBcodeResMsg = SyncBcodeResMsg;

/** mini tests */

/** bcode sync */

// let state_bcode_req = {
//     contractAddress : '0x1...',
// };

// let state_bcode_res = {
//     contractAddress : '0x1...',
//     deployedByteCode : [11,12,13,15,16,13,111,133,662]
// };
//
// SyncMsgBuilder.bCodeReqFromObj(state_bcode_res, (err,msg)=>{
//     if(err){
//         console.log("err " + err );
//     }else{
//         console.log(msg.toPrettyJSON());
//         let encoded = msg.toNetwork();
//         SyncMsgBuilder.bCodeResFromNetwork(encoded,(err,msg2)=>{
//             console.log(msg.toPrettyJSON());
//         });
//     }
// });
//
// SyncMsgBuilder.bCodeReqFromObj(state_bcode_req,(err,msg)=>{
//     if(err){
//         console.log("Err " + err);
//     }else{
//         console.log(msg.toPrettyJSON());
//         let encoded = msg.toNetwork();
//         SyncMsgBuilder.bCodeReqFromNetwork(encoded , (err,msg2)=>{
//             console.log(msg2.toPrettyJSON());
//         });
//     }
// });
/** states/deltas sync */
//
// let state_sync_req_obj = {
//     contractAddress : '0x...',
//     fromIndex: 1,
//     toIndex : 101,
//     fromHash : '0x...',
//     toHash : '0x...'
// };
//
// let state_sync_res_obj = {
//     contractAddress : '0x...',
//     states : [{index:4,hash : '0x1',data : [11,12,13]},{index:2,hash : '0x2',data : [311,122,133]},
//               {index:3,hash : '0x3',data : [151,152,143]}]
// };


// SyncMsgBuilder.stateReqFromObj(state_sync_req_obj,(err,msg)=>{
//     // console.log("err req ? " + err);
//     // console.log(" req range : " + JSON.stringify(msg.getRange()));
//     // console.log("raw "  + msg.toPrettyJSON());
//
//     let encoded = msg.toNetwork();
//     console.log("encoded : " + encoded);
//     SyncMsgBuilder.stateReqFromNetwork(encoded,(err,msg2)=>{
//         console.log("raw " + msg2.toPrettyJSON());
//     })
// });


//
//
// SyncMsgBuilder.stateResFromObj(state_sync_res_obj, (err,msg)=>{
//     // console.log("err res ? " + err);
//     // console.log("stats orderd  : " + JSON.stringify(msg.sortStates()));
//     // console.log("raw "  + msg.toPrettyJSON());
//
//     let encoded = msg.toNetwork();
//     console.log("encoded:" + encoded);
//     // SyncMsgBuilder.stateResFromNetwork(encoded, (err, msg2)=>{
//     //     console.log("raw" + msg2.toPrettyJSON());
//     //     msg2.sortStates();
//     //     console.log("raw" + msg2.toPrettyJSON());
//     // });
// });


/** batch state sync request */
// let state_sync_req_obj = {
//     contractAddress : '0x...',
//     fromIndex: 1,
//     toIndex : 101,
//     fromHash : '0x...',
//     toHash : '0x...'
// };
// let msgs = [];
// for(let i=0;i<15;++i){
//   msgs.push(state_sync_req_obj);
// }
// SyncMsgBuilder.batchStateReqFromObjs(msgs,(err,results)=>{
//   console.log("is err? " + err);
//   results.forEach(res=>{
//     console.log(res.contractAddress());
//   });
// });


// let state_sync_req_obj = {
//     contractAddress : '0x...',
//     fromIndex: 1,
//     toIndex : 101,
//     fromHash : '0x...',
//     toHash : '0x...'
// };
// const msg = this.toJSON();
// const encoded = EncoderUtil.encodeToNetwork(msg);
// console.log(encoded);
// let b= Buffer.from(encoded);

