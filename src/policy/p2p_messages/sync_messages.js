const constants = require('../../common/constants');
const MSG_TYPES = constants.P2P_MESSAGES;
const schemeValidator = require('./schemes/SchemeValidator');
const nodeUtils = require('../../common/utils');
const EncoderUtil = require('../../common/EncoderUtil');

class StateMsgBuilder{

    static fromNetworkReq(networkReq,callback){
        let decoded = EncoderUtil.decodeFromNetwork(networkReq);
        decoded = JSON.parse(decoded);
        if(decoded != null) {
            StateMsgBuilder.flatBodyReq(decoded,callback);
        }else{
            callback("error decoding",null);
        }
    }
    static flatBodyReq(objReq,callback){
        let header = StateMsgBuilder._createHeader(objReq.header);
        let body = objReq.body;
        callback(null,new StateSyncReqMsg(header,body));
    }
    static fromObjReq(objReq,callback){
        if(StateMsgBuilder._validateFlatFields(objReq)) {
            objReq.type = MSG_TYPES.STATE_SYNC_REQ;
            let header = StateMsgBuilder._createHeader(objReq);
            let body = {
                address: objReq.address,
                withByteCode: objReq.withBytecode,
                range: {
                    from: {
                        index: objReq.fromIndex,
                        hash: objReq.fromHash
                    },
                    to: {
                        index: objReq.toIndex,
                        hash: objReq.toHash,
                    }
                }
            };
            callback(null, new StateSyncReqMsg(header, body));
        }else{
            callback('[-] invalid fields' , null);
        }
    }
    /** pending until scheme validation is in polace
     * currently error with path (global scheme file is not relative)*/
    static __fromObjReq(objReq,callback){
        schemeValidator.validateScheme(objReq,MSG_TYPES.STATE_SYNC_REQ,(err,isValid)=>{
            if(err){
                // TODO:: remove throw with logger
                console.log("[-] err validating scheme ", err);
                callback(err,null);
            }else{
                if(isValid){
                    objReq.type = MSG_TYPES.STATE_SYNC_REQ;
                    let header = StateMsgBuilder._createHeader(objReq);
                    let body = {
                        address : objReq.address,
                        withByteCode : objReq.withByteCode,
                        range : {
                            from : {
                                index : objReq.fromIndex,
                                hash : objReq.fromHash
                            },
                            to : {
                                index : objReq.toIndex,
                                hash : objReq.toHash,
                            }
                        }
                    };
                    callback(null,new StateSyncReqMsg(header,body));

                }else{
                    callback('[-] invalid scheme error',null);
                }
            }
        });
    }
    static _createHeader(obj){
        return {
            from : obj.from,
            to : obj.to ,
            type : obj.type,
            timestamp : nodeUtils.unixTimestamp()
        };
    }
    static _validateFlatFields(reqObj){
        let fields = ["from","to","address","withByteCode","fromIndex","fromHash","toIndex","toHash"];

        let isMissing = fields.some(f=>{
            if(!(f in reqObj)){
                return true;
            }else{
                return false;
            }
        });

        return !isMissing;
    }
}

class StateSyncReqMsg{
    constructor(rawHeader,rawBody){
        this._rawMsg = {
            header : rawHeader,
            body : rawBody,
        };

    }
    withByteCode(){
        return this.body().withByteCode;
    }
    body(){
        return this._rawMsg.body;
    }
    header(){
        return this._rawMsg.header;
    }
    range(){
        return this.body().range;
    }
    fromIndex(){
        return this.range().from.index;
    }
    fromHash(){
        return this.range().from.hash;
    }
    toIndex(){
        return this.range().to.index;
    }
    toHash(){
        return this.range().to.hash;
    }
    toNetworkStream(){
        return EncoderUtil.encodeToNetwork(this.toJSON());
    }
    toJSON(){
        return JSON.stringify(this._rawMsg);
    }
    toPrettyJSON(){
        return JSON.stringify(this._rawMsg,null,2);
    }
     isValidFields(){
        let header = this.header();
        let body = this.body();
         if(header === undefined || body === undefined){
             return false;
         }
        let inHeader = ["from","to","type", "timestamp"];
        let inBody = ["address","withByteCode", "range"];
        let inRange = ["from","to"];
        let inRangeDetails = ["index","hash"];

        let missingHeader = inHeader.some(val=>{
            if(!(val in header)){
                return true;
            }else{
                return false;
            }
        });

        let missingBody = inBody.some(val=>{
            if(!(val in body)){
                return true;
            }else{
                return false;
            }
        });

        let missingInRange = inRange.some(val=>{
            if(!(val in body.range)){
                return true;
            }else{
                return false;
            }
        });

        let missingInRangeDetails = inRangeDetails.some(val=>{
            if(!(val in body.range.from || val in body.to)){
                return true;
            }else{
                return false;
            }
        });

        let notValid = missingHeader || missingBody || missingInRange || missingInRangeDetails;
        return !notValid;
    }

}

/* mini test */

let rawMsg = {
    from : "QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm",
    to: "QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzd33m",
    address: "0xa6c1c67b760d7d6d71530cb20e5845fd213396c05967251807412243d38b6f35" , //addr1
    withBytecode: false,
    fromIndex : 0,
    fromHash : '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8', //hello
    toIndex : 100,
    toHash : '0x6d91615c65c0e8f861b0fbfce2d9897fb942293e341eda10c91a6912c4f32668' //hello2
};

StateMsgBuilder.fromObjReq(rawMsg,(err,msg)=>{
    let encoded = msg.toNetworkStream();
    console.log(msg.toPrettyJSON());
    console.log("valid ?  " + msg.isValidFields())
    StateMsgBuilder.fromNetworkReq(encoded, (err,msg2)=>{
        console.log(msg2.toPrettyJSON());
        console.log("valid ?  " + msg2.isValidFields())
    });
});




