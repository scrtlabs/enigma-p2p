const path = require('path');
const loadJsonFile = require('load-json-file');
const constants = require('../../../common/constants');
const MsgTypes = constants.P2P_MESSAGES;
const Validator = require('jsonschema').Validator;

function loadScheme(path, callback) {
  loadJsonFile(path).then((json) => {
    return callback(null, json);
  }).catch((err)=>{
    return callback(err);
  });
}
// ./schemes/state_sync_scheme.json
const schemeMap = {
  [MsgTypes.SYNC_STATE_REQ]: (testObj, callback) =>{
    loadScheme(path.join(__dirname, '/state_sync_scheme.json'), (err, preScheme)=>{
      if (err) {
        callback(err);
      } else {
        const scheme = preScheme[MsgTypes.SYNC_STATE_REQ];
        const v = new Validator();
        const isValid = v.validate(testObj, scheme).valid;
        callback(null, isValid);
      }
    });
  },

  [MsgTypes.SYNC_STATE_RES]: (testObj, callback)=>{
    loadScheme(path.join(__dirname, '/state_sync_scheme.json'), (err, preScheme)=>{
      if (err) {
        callback(err);
      } else {
        const scheme = preScheme[MsgTypes.SYNC_STATE_RES];
        const v = new Validator();
        const isValid = v.validate(testObj, scheme).valid;
        callback(null, isValid);
      }
    });
  },
  [MsgTypes.SYNC_BCODE_REQ]: (testObj, callback)=>{
    loadScheme(path.join(__dirname, '/state_sync_scheme.json'), (err, preScheme)=>{
      if (err) {
        callback(err);
      } else {
        const scheme = preScheme[MsgTypes.SYNC_BCODE_REQ];
        const v = new Validator();
        const isValid = v.validate(testObj, scheme).valid;
        callback(null, isValid);
      }
    });
  },
  [MsgTypes.SYNC_BCODE_RES]: (testObj, callback)=>{
    loadScheme(path.join(__dirname, '/state_sync_scheme.json'), (err, preScheme)=>{
      if (err) {
        callback(err);
      } else {
        const scheme = preScheme[MsgTypes.SYNC_BCODE_RES];
        const v = new Validator();
        const isValid = v.validate(testObj, scheme).valid;
        callback(null, isValid);
      }
    });
  },
};

function _validateScheme(testedObj, msgName, callback) {
  const s = schemeMap[msgName];
  if (s) {
    s(testedObj, callback);
  } else {
    callback('no such scheme');
  }
};

/** valida a scheme
 * supported:
 * - SYNC_STATE_RES
 * - SYNC_STATE_REQ
 * @param {Json} testedObj,
 * @param {String} msgName from MsgTypes
 * @param {Function} callback , (err,isValid)=>{
 *  -err -> error , does not imply if the msg is ok or not
 *  -isValid -> true = valid, false = invalid
 * }
 *
 * */
module.exports.validateScheme = (testedObj, msgName, callback)=>{
  _validateScheme(testedObj, msgName, callback);
};


// let state_sync_req_obj = {
//     msgType : 'SYNC_STATE_REQ',
//     contractAddress : '0x...',
//     fromIndex: 1,
//     toIndex : 101,
//     fromHash : '0x...',
//     toHash : '0x...'
// };
//
// let state_sync_res_obj = {
//     msgType :"SYNC_STATE_RES",
//     contractAddress : '0x...',
//     states : [{index:1,hash : '0x1',data : [11,12,13]},{index:2,hash : '0x2',data : [311,122,133]},
//               {index:3,hash : '0x3',data : [151,152,143]}]
// };
//
// _validateScheme(state_sync_res_obj , MsgTypes.SYNC_STATE_RES ,(err,isValid)=>{
//     if(err){
//         console.log(err);
//     }else{
//         console.log("is valid? " + isValid);
//     }
// });


/** byte code validation */

// let state_bcode_req = {
//     msgType : 'SYNC_BCODE_REQ',
//     contractAddress : '0x1...',
// };
//
//
// _validateScheme(state_bcode_req, MsgTypes.SYNC_BCODE_REQ, (err,isValid)=>{
//     if(err){
//         console.log(err);
//     }else{
//         console.log("is valid ? " + isValid);
//     }
// });


//
// let state_bcode_res = {
//     msgType : 'SYNC_BCODE_REQ',
//     contractAddress : '0x1...',
//     deployedByteCode : [11,12,13,15,16,13,111,133,662]
// };
//
// _validateScheme(state_bcode_res, MsgTypes.SYNC_BCODE_RES, (err,isValid)=>{
//     if(err){
//         console.log(err);
//     }else{
//         console.log("is valid ? " + isValid);
//     }
// });


