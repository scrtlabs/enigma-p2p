const DbUtils = require('../common/DbUtils');

class DbKey{
    constructor(byteKey, hexAddr, idx){
        this._byteKey = byteKey;
        this._hexAddr = hexAddr;
        this._idx = idx;
    }
    /** key builder
     * @param {String} addr, secret-contract address
     * @param {Integer} idx , state delta id */
    static fromTouple(addr,idx){
        let byteAddr = DbUtils.hexToBytes(addr);
        let byteKey = DbUtils.toBytesKey(byteAddr,idx);
        return new DbKey(byteKey,addr, idx);
    }
    /** key builder */
    static fromBytes(byteKey){
        let tuple = DbUtils.deltaKeyBytesToTuple(byteKey);
        return new DbKey(byteKey,tuple.address,tuple.index);
    }
}