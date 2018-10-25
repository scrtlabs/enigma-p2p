const constants = require('../../common/constants');
const MSG_TYPES = constants.P2P_MESSAGES;
const schemeValidator = require('./schemes/SchemeValidator');
const nodeUtils = require('../../common/utils');
const EncoderUtil = require('../../common/EncoderUtil');

// class StateMsgBuilder{
//
//     static fromNetworkReq(networkReq,callback){
//         let decoded = EncoderUtil.decodeFromNetwork(networkReq);
//         decoded = JSON.parse(decoded);
//         if(decoded != null) {
//             StateMsgBuilder.flatBodyReq(decoded,callback);
//         }else{
//             callback("error decoding",null);
//         }
//     }
//     static flatBodyReq(objReq,callback) {
//         let header = StateMsgBuilder._createHeader(objReq.header);
//         let body = objReq.body;
//         callback(null, new StateSyncReqMsg(header, body));
//     }
// }



/* mini test */

// let rawMsg = {
//     from : "QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm",
//     to: "QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzd33m",
//     address: "0xa6c1c67b760d7d6d71530cb20e5845fd213396c05967251807412243d38b6f35" , //addr1
//     withBytecode: false,
//     fromIndex : 0,
//     fromHash : '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8', //hello
//     toIndex : 100,
//     toHash : '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32668' //hello2
// };
//
//
// StateMsgBuilder.__fromObjReq(rawMsg,(err,msg)=>{
//     if(err){
//         console.log(err);
//     }else{
//         console.log(msg.toJSON());
//     }
// });
//
// StateMsgBuilder.fromObjReq(rawMsg,(err,msg)=>{
//     let encoded = msg.toNetworkStream();
//     console.log(msg.toPrettyJSON());
//     console.log("valid ?  " + msg.isValidFields())
//     StateMsgBuilder.fromNetworkReq(encoded, (err,msg2)=>{
//         console.log(msg2.toPrettyJSON());
//         console.log("valid ?  " + msg2.isValidFields())
//     });
// });
//

