const CID = require('cids');
const multihash = require('multihashes');
const CIDUtil = require('../../common/CIDUtil');

class EngCID{

    constructor(){
        this._cid = null;
    }

    static createFromKeccack256(keccack256Hash){
        let cid = CIDUtil.createCID(keccack256Hash);
        if(cid){

            let engCid = new EngCID();
            engCid._setCID(cid);
            return engCid

        }
        return null;
    }
    getCID(){
        return this._cid;
    }
    getKeccack256(with0x = false){
        let h = CIDUtil.getKeccak256FromCID(this._cid);
        if(with0x){
            return '0x' + h;
        }
        return h;
    }
    toBuffer(){
        return this._cid.buffer;
    }
    toB58String(){
        return this._cid.toBaseEncodedString();
    }
    equalCID(cid){
        return this._cid.equals(cid);
    }
    equalKeccack256(keccackHash){

        let cid = CIDUtil.createCID(keccackHash);

        if(cid){
            return this.equalCID(cid);
        }
        return false;
    }
    equalEngCID(engCID){
        if (engCID.constructor.name === 'EngCID'){
            return this.equalCID(engCID.getCID());
        }
        return false;
    }
    _setCID(cid){
        this._cid = cid;
    }

}


/** examples */

// let eth = '0xe8a5770e2c3fa1406d8554a6539335f5d4b82ed50f442a6834149d9122e7f8af';
// let eng = EngCID.createFromKeccack256(eth);
//
// let eth2 = 'e8a5770e2c3fa1406d8554a6539335f5d4b82ed50f442a6834149d9122e7f8af';
// let eng2 = EngCID.createFromKeccack256(eth2);
//
// console.log(eng.toB58String());
// console.log(eng.toBuffer());
// console.log(eng.getKeccack256());
//
// console.log(eng.equalCID(eng2.getCID()));
// console.log(eng.equalKeccack256(eth2));
// console.log(eng.equalEngCID(eng2));
//
//
