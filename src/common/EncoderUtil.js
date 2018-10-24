const msgpack = require("msgpack-lite");

class EncoderUtil{
    static encode(rawObject){
        try{
            return msgpack.encode(rawObject);
        }catch(e){
            return null;
        }
    }
    static encodeToNetwork(rawObject){
        let encodedBuffer = EncoderUtil.encode(rawObject);
        if(encodedBuffer){
            let encodedByteArray =[...encodedBuffer];
            return encodedByteArray;
        }
        return null;
    }
    static decode(encodedBuffer){
        try{
            return msgpack.decode(encodedBuffer);
        }catch(e){
            return null;
        }
    }
    static decodeFromNetwork(encodedBytes){
        let encodedBuffer = Buffer.from(encodedBytes);
        let decoded = EncoderUtil.decode(encodedBuffer);
        return decoded;
    }
}


module.exports = EncoderUtil;
