const path = require('path');
const loadJsonFile = require('load-json-file');
const constants = require('../../../common/constants');
const MsgTypes = constants.P2P_MESSAGES;
const Validator = require('jsonschema').Validator;

function loadScheme(path, callback){
    loadJsonFile(path).then(json => {
        callback(null,json);
    })
    .catch((err)=>{
            callback(err);
    });
}

//./schemes/state_sync_scheme.json
const schemeMap = {
    [MsgTypes.SYNC_STATE_REQ] : (testObj, callback) =>{

        loadScheme(path.join(__dirname,'/state_sync_scheme.json'),(err,preScheme)=>{
            if(err){
                callback(err);
            }else{
                let scheme = preScheme[MsgTypes.SYNC_STATE_REQ];
                let v = new Validator();
                let isValid = v.validate(testObj,scheme).valid;
                callback(null,isValid);
            }
        });
    },

    [MsgTypes.SYNC_STATE_RES] : (testObj, callback)=>{
        loadScheme(path.join(__dirname,'/state_sync_scheme.json'), (err,preScheme)=>{
            if(err){
                callback(err);
            }else{
                let scheme = preScheme[MsgTypes.SYNC_STATE_RES];
                let v = new Validator();
                let isValid = v.validate(testObj,scheme).valid;
                callback(null,isValid);
            }
        });
    },
};

function _validateScheme(testedObj, msgName, callback){
    let s = schemeMap[msgName];
    if(s){
        s(testedObj,callback);
    }else{
        callback("no such scheme");
    }
};

/** valida a scheme
 * supported:
 * - STATE_SYNC_REQ
 * - STATE_SYNC_RES
 * @param {Json} testedObj,
 * @param {String} Msg name from  MsgTypes
 * @param {Function} callback , (err,isValid)=>{
 *  -err -> error , does not imply if the msg is ok or not
 *  -isValid -> true = valid, false = invalid
 * }
 *
 * */
module.exports.validateScheme = (testedObj, msgName, callback)=>{
    _validateScheme(testedObj,msgName,callback);
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
//     states : [{index:1,hash : '0x1',data : [11,12,13]},{index:2,hash : '0x2',data : [311,122,133]},{index:3,hash : '0x3',data : [151,152,143]}]
// };
//
// _validateScheme(state_sync_res_obj , MsgTypes.SYNC_STATE_RES ,(err,isValid)=>{
//     if(err){
//         console.log(err);
//     }else{
//         console.log("is valid? " + isValid);
//     }
// });








