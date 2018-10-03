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


/*** mini tests */

// // take input from Core (encoded) and compare the output
//
// let fromCore = [146, 129, 164, 110, 97, 109, 101, 166, 65, 110, 100, 114, 101, 119, 129, 164, 110, 97, 109, 101, 165, 77, 97, 120, 105, 109];
//
// let j = EncoderUtil.decodeFromNetwork(fromCore);
//
// console.log(j);
// // take output obj from network and decode compare with core decoded
//
// let toCore = [{"name":"Andrew"},{"name":"Maxim"}];
//
// let encoded= EncoderUtil.encodeToNetwork(toCore);
//
// console.log(encoded);
