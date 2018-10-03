const msgpack = require("msgpack-lite");

class EncoderUtil{
    static encode(rawObject){
        try{
            var buffer = msgpack.encode(rawObject);
            return buffer;
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
            let decoded = msgpack.decode(encodedBuffer);
            return decoded;
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