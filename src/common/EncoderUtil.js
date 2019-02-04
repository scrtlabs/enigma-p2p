const msgpack = require('msgpack-lite');

class EncoderUtil {
  static encode(rawObject) {
    try {
      return msgpack.encode(rawObject);
    } catch (e) {
      return null;
    }
  }
  static encodeToNetwork(rawObject) {
    const encodedBuffer = EncoderUtil.encode(rawObject);
    if (encodedBuffer) {
      const encodedByteArray =[...encodedBuffer];
      return encodedByteArray;
    }
    return null;
  }
  static decode(encodedBuffer) {
    try {
      return msgpack.decode(encodedBuffer);
    } catch (e) {
      return null;
    }
  }
  static decodeFromNetwork(encodedBytes) {
    const encodedBuffer = Buffer.from(encodedBytes);
    const decoded = EncoderUtil.decode(encodedBuffer);
    return decoded;
  }
  static hexToAscii(hex) {
    if (!(typeof hex === 'number' || typeof hex == 'string')) {
      return '';
    }
    hex = hex.toString().replace(/\s+/gi, '');
    let stack = [];
    for (let n = 0; n < hex.length; n += 2) {
      const code = parseInt(hex.substr(n, 2), 16);
      if (!isNaN(code) && code !== 0) {
        stack.push(String.fromCharCode(code))
      }
    }
    return stack.join('');
  }
}


module.exports = EncoderUtil;

/** * mini tests */
// // take input from Core (encoded) and compare the output
//
// let fromCore = [146, 129, 164, 110, 97, 109, 101, 166, 65, 110, 100, 114, 101,
//                 119, 129, 164, 110, 97, 109, 101, 165, 77, 97, 120, 105, 109];
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
