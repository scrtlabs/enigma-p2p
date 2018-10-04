const CID = require('cids');
const multihash = require('multihashes');

class CIDUtil{
    static createCID(ethHash){

        let h = CIDUtil.parseHashStr(ethHash);

        let buffHash = Buffer.from(h,'hex');

        let mh = multihash.encode(buffHash, 'keccak-256');

        return new CID(1,'eth-block',mh);

    }
    static parseHashStr(h){

        let final = null;

        if(h.length == 64){

            final = h;

        }else if(h.length == 66){

            final = h.substring(2,h.length);
        }
        return final;
    }
    static getKeccak256FromCID(cid){

        if(CIDUtil.isValidCID(cid) || true){
            return multihash.toHexString(cid.multihash);
        }
        return null;
    }

    static isValidCID(cid){
        return CID.isCID(cid);
    }
}


module.exports = CIDUtil;