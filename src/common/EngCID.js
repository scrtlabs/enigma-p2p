const CIDUtil = require('./CIDUtil');
const EncoderUtil = require('./EncoderUtil');

/**
 * Abstraction - wrapper to libp2p-cid
 * */
class EngCID {
  constructor(encoder = EncoderUtil) {
    this._encoder = encoder;
    this._cid = null;
    this._address = null;
  }
  static createFromByteArray(bytes){
    const h = CIDUtil.hashByteArray(bytes);
    return this.createFromKeccack256(h);
  }
  static createFromSCAddress(scAddr) {
    const cid = CIDUtil.createCID(scAddr);
    if (cid) {
      const engCid = new EngCID();
      engCid._setCID(cid);
      engCid._setScAddress(scAddr);
      return engCid;
    }
    return null;
  }
  static createFromKeccack256(keccack256Hash) {
    const cid = CIDUtil.createCID(keccack256Hash);
    if (cid) {
      const engCid = new EngCID();
      engCid._setCID(cid);
      return engCid;
    }
    return null;
  }
  static createFromNetwork(encodedB58byteArray) {
    const b58 = EncoderUtil.decodeFromNetwork(encodedB58byteArray);
    const cid = CIDUtil.createCIDFromB58(b58);
    if (cid) {
      const engCID = new EngCID();
      engCID._setCID(cid);
      return engCID;
    }
    return null;
  }

  getCID() {
    return this._cid;
  }

  /** get the keccack256 hash of a CID
     * @param {Boolean} with0x , if true then add 0x to the result
     * @return {String} h, a keccak hash representation
     * */
  getKeccack256(with0x = false) {
    const h = CIDUtil.getKeccak256FromCID(this._cid);
    if (with0x) {
      return '0x' + h;
    }
    return h;
  }

  toBuffer() {
    return this._cid.buffer;
  }

  toB58String() {
    return this._cid.toBaseEncodedString();
  }

  /** Compare if this and other are equal
     * @param {CID} cid - other cid to test
     * @return {Boolean} true - this.cid == cid , false otherwise*/
  equalCID(cid) {
    return this._cid.equals(cid);
  }

  equalKeccack256(keccackHash) {
    const cid = CIDUtil.createCID(keccackHash);
    if (cid) {
      return this.equalCID(cid);
    }
    return false;
  }

  equalEngCID(engCID) {
    if (engCID.constructor.name === 'EngCID') {
      return this.equalCID(engCID.getCID());
    }
    return false;
  }

  /** Encode the CID into a network stream.
     * Steps:
     * 1) b58Str = this.cid
     * 2) e = encode(b58Str), encode with encoder util, currently msgpack
     * 3) b = toBytes(e)
     * 4) return b
     * @return {Array<Bytes>}
     * */
  encodeToNetwork() {
    return this._encoder.encodeToNetwork(this.toB58String());
  }

  _setCID(cid) {
    this._cid = cid;
  }
  _setScAddress(scAddr) {
    this._address = scAddr;
  }
  getScAddress() {
    return this._address;
  }
}

module.exports = EngCID;

// /** examples */
//
// let eth = '0xe8a5770e2c3fa1406d8554a6539335f5d4b82ed50f442a6834149d9122e7f8af';
// let eng = EngCID.createFromKeccack256(eth);
//
// let eth2 = 'e8a5770e2c3fa1406d8554a6539335f5d4b82ed50f442a6834149d9122e7f8af';
// let eng2 = EngCID.createFromKeccack256(eth2);
// let otherCid = new CID(eng2.toB58String());
// console.log("generated "  + eng2.equalCID(otherCid));
// console.log(eng.toB58String());
// console.log(eng.toBuffer());
// console.log(eng.getKeccack256());
//
// console.log(eng.equalCID(eng2.getCID()));
// console.log(eng.equalKeccack256(eth2));
// console.log(eng.equalEngCID(eng2));
// //network encoding this
// let fromNetwork = eng.encodeToNetwork();
// let newCID = EngCID.createFromNetwork(fromNetwork);
// console.log(eng.equalEngCID(newCID));

