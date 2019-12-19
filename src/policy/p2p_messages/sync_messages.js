const constants = require("../../common/constants");
const MSG_TYPES = constants.P2P_MESSAGES;
const schemeValidator = require("./schemes/SchemeValidator");
const EncoderUtil = require("../../common/EncoderUtil");
const waterfall = require("async/waterfall");

class MsgBuilder {
  /** no validation test */
  static responseMessageFromNetwork(msg) {
    const msgObj = EncoderUtil.decode(msg);
    if (msgObj.hasOwnProperty("msgType")) {
      switch (msgObj.msgType) {
        case MSG_TYPES.SYNC_STATE_RES:
          return MsgBuilder.stateResponseMessage(msgObj);
        case MSG_TYPES.SYNC_BCODE_RES:
          return MsgBuilder.bcodeResponseMessage(msgObj);
      }
    }
    return null;
  }

  static stateResponseMessage(msgObj) {
    return new SyncStateResMsg(msgObj);
  }

  static bcodeResponseMessage(msgObj) {
    return new SyncBcodeResMsg(msgObj);
  }

  static requestMessageFromNetwork(msg) {
    const msgObj = EncoderUtil.decode(msg);
    if (msgObj.hasOwnProperty("msgType")) {
      switch (msgObj.msgType) {
        case MSG_TYPES.SYNC_STATE_REQ:
          return MsgBuilder.stateRequestMessage(msgObj);
        case MSG_TYPES.SYNC_BCODE_REQ:
          return MsgBuilder.bCodeRequestMessage(msgObj);
      }
    }
    return null;
  }
  static batchStateRequest(msgsObjList) {
    return msgsObjList.map(m => {
      m.msgType = MSG_TYPES.SYNC_STATE_REQ;
      return new SyncStateReqMsg(m);
    });
  }
  static stateRequestMessage(msgObj) {
    msgObj.msgType = MSG_TYPES.SYNC_STATE_REQ;
    return new SyncStateReqMsg(msgObj);
  }
  static bCodeRequestMessage(msgObj) {
    msgObj.msgType = MSG_TYPES.SYNC_BCODE_REQ;
    return new SyncBcodeReqMsg(msgObj);
  }
}

class SyncMsg {
  constructor(rawMsg) {
    this._rawMsg = rawMsg;
  }
  type() {
    return this._rawMsg.msgType;
  }
  toJSON() {
    return JSON.stringify(this._rawMsg);
  }
  toPrettyJSON() {
    return JSON.stringify(this._rawMsg, null, 2);
  }
  /** before sending to network;
   * @return {Array<Integer>} encoded msgpack array of the msg*/
  toNetwork() {
    return EncoderUtil.encode(this._rawMsg);
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
      toHash: this.toHash()
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
  deltas() {
    return this._rawMsg.result.deltas;
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
    this.states().sort((d1, d2) => {
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
  /** @deprecated */
  contractAddress() {
    return this._rawMsg.contractAddress;
  }
  /** @deprecated */
  deployedBytecode() {
    return this._rawMsg.deployedBytecode;
  }
  bytecode() {
    return this._rawMsg.result.bytecode;
  }
  address() {
    return this._rawMsg.result.address;
  }
}

module.exports.SyncStateResMsg = SyncStateResMsg;
module.exports.SyncStateReqMsg = SyncStateReqMsg;
//module.exports.SyncMsgBuilder = SyncMsgBuilder;
module.exports.MsgBuilder = MsgBuilder;
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
