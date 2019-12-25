const CID = require("cids");
const multihash = require("multihashes");
const Web3 = require("web3");

class CIDUtil {
  /**
   * The hashing function that is used currently is hashKeccack256 but there is not reason it cannot change.
   * @param {Array<Byte>} delta
   * @return {string} hash
   * */
  static hashByteArray(delta) {
    return CIDUtil.hashKeccack256(delta);
  }
  static hashKeccack256(value) {
    return new Web3().utils.sha3(value);
  }

  /** cast Ethereum keccack256 function into a CID
   * @param {String} ethHash, with 0x len 66, 64 without 0x, both inputs are fine
   * @return {CID} cid representing the input.
   * */
  static createCID(ethHash) {
    try {
      const h = CIDUtil.parseHashStr(ethHash);
      const buffHash = Buffer.from(h, "hex");
      const mh = multihash.encode(buffHash, "keccak-256");
      return new CID(1, "eth-block", mh, "base58btc");
    } catch (err) {
      // console.log('[-] err creating cid {%s}', err);
      return null;
    }
  }

  static createCIDFromB58(b58CID) {
    try {
      return new CID(b58CID);
    } catch (err) {
      return null;
    }
  }

  /** remove 0x from the hash if existing
   * @param {String} h, keccack256 hash
   * @return {String} hash without 0x or the same
   * */
  static parseHashStr(h) {
    let final = null;
    if (h.length == 64) {
      final = h;
    } else if (h.length == 66) {
      final = h.substring(2, h.length);
    }
    return final;
  }

  static getKeccak256FromCID(cid) {
    try {
      return multihash.toHexString(cid.multihash);
    } catch (err) {
      return null;
    }
  }

  static isValidCID(cid) {
    return CID.isCID(cid);
  }
}

module.exports = CIDUtil;
