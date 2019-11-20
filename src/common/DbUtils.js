const Web3 = require("web3");

class DbUtils {
  static toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    }).join("");
  }

  static hexToBytes(hex) {
    if (hex.slice(0, 2) === "0x") {
      hex = hex.slice(2, hex.length);
    }
    const b = Buffer.from(hex, "hex");
    return [...b];
  }

  static intTo4BytesArr(num) {
    if (num > 4294967295) {
      throw new Error("integer overflow");
    }
    const arr = new Uint8Array([
      (num & 0xff000000) >> 24,
      (num & 0x00ff0000) >> 16,
      (num & 0x0000ff00) >> 8,
      num & 0x000000ff
    ]);
    return Array.from(arr);
  }

  static bytesArrToInt(bytesArr) {
    const buf = Buffer.from(bytesArr);
    return buf.readUInt32BE(0);
  }

  static deltaKeyBytesToTuple(byteKey) {
    let addr = byteKey.slice(0, byteKey.length - 4);
    addr = DbUtils.toHexString(addr);
    let index = byteKey.slice(byteKey.length - 4, byteKey.length);
    index = DbUtils.bytesArrToInt(index);
    return { address: addr, index: index };
  }
  static toBytesKey(contractByteAddr, index) {
    const res = [];
    contractByteAddr.forEach(c => {
      res.push(c);
    });
    if (index >= 0) {
      const indexBytes = DbUtils.intTo4BytesArr(index);
      indexBytes.forEach(c => {
        res.push(c);
      });
    }
    return res;
  }
  static isValidEthereumAddress(address) {
    let web3 = new Web3();
    return web3.utils.isAddress(address);
  }
}

module.exports = DbUtils;
