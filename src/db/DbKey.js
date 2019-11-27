const DbUtils = require("../common/DbUtils");

class DbKey {
  constructor(byteKey, hexAddr, idx) {
    this._byteKey = byteKey;
    this._hexAddr = hexAddr;
    this._idx = idx;
    this._isContract = true;
    if (idx) {
      this._isContract = false;
    }
    if (this._hexAddr && this._hexAddr.slice(0, 2) === "0x") {
      this._hexAddr = this._hexAddr.slice(2);
    }
  }
  /** key builder
   * create a key pointing to bytecode
   * represented by addr only
   * @param {String} addr, secret-contract address
   * @return {DbKey} dbKey
   */
  static fromContractAddr(addr) {
    const byteAddr = DbUtils.hexToBytes(addr);
    return new DbKey(byteAddr, addr);
  }
  /** key builder
   * create a key pointing to bytecode
   * represented by addr only
   * @param {Array<Integer>} byteAddr, secret contract address
   * @return {DbKey} dbKey
   */
  static fromContractBytes(byteAddr) {
    const addr = DbUtils.toHexString(byteAddr);
    return new DbKey(byteAddr, addr);
  }
  /** key builder
   * @param {String} addr, secret-contract address
   * @param {Integer} idx , state delta id
   * @return {DbKey} dbKey
   */
  static fromDeltaTouple(addr, idx) {
    const byteAddr = DbUtils.hexToBytes(addr);
    const byteKey = DbUtils.toBytesKey(byteAddr, idx);
    return new DbKey(byteKey, addr, idx);
  }
  /** key builder
   * @param {Array} byteKey
   * @return {DbKey}
   */
  static fromDeltaBytes(byteKey) {
    const tuple = DbUtils.deltaKeyBytesToTuple(byteKey);
    return new DbKey(byteKey, tuple.address, tuple.index);
  }
  isContract() {
    return this._isContract;
  }
  isDelta() {
    return !this.isContract();
  }
  getIndex() {
    return this._idx;
  }
  getAddress() {
    return this._hexAddr;
  }
  getBytesKey() {
    return this._byteKey;
  }
  equals(otherDbKey) {
    if (this.isContract() && otherDbKey.isContract()) {
      const equal = this.getAddress() === otherDbKey.getAddress();
      return equal;
    } else if (this.isDelta() && otherDbKey.isDelta()) {
      const equal = this.getAddress() === otherDbKey.getAddress();
      return equal && this.getIndex() === otherDbKey.getIndex();
    } else {
      return false;
    }
  }
}

module.exports = DbKey;
