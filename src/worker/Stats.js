const nodeUtils = require('../common/utils');
const constants = require('../common/constants');
const STAT_TYPES = constants.STAT_TYPES;

/**
 * Stat Types:
 * - CONNECTION_SUCCESS // dial success
 * - CONNECTION_FAILURE // dial failure
 * - HANDSHAKED_SUCCESS
 * - HANDSHAKE_FAILURE
 * - BLACKLIST
 * - DEBLACKLIST
 * */

const statTypeValidator = {

    [STAT_TYPES.CONNECTION_SUCCESS] :(param)=>{
        return ("peerInfo" in param);
    },
    [STAT_TYPES.CONNECTION_FAILURE]:(param)=>{
        return ("peerInfo" in param);
    },
    [STAT_TYPES.HANDSHAKE_SUCCESS]:(param)=>{
        return ("peerInfo" in param);
    },
    [STAT_TYPES.HANDSHAKE_FAILURE]:(param)=>{
        return ("peerInfo" in param);
    },
    [STAT_TYPES.BLACKLIST]:(param)=>{
        return ("peerInfo" in param);
    },
    [STAT_TYPES.DEBLACKLIST]:(param)=>{
        return ("peerInfo" in param);
    },

};
class StatUpdate{

    constructor(type, params){
        this._valid = false;
        this._type = null;
        this._params = null;
        if(StatUpdate._validStat(type,params)){

            params['timestamp'] = nodeUtils.unixTimestamp();
            this._type = type;
            this._params = params;
            this._valid = true;
        }
        if(new.target === StatUpdate){
            Object.freeze(this);
        }
    }
    getType(){
        return this._type;
    }
    getParams(){
        return this._params;
    }
    isValid(){
        return this._valid;
    }
    isHandshake(){
        return (this._type === STAT_TYPES.HANDSHAKE_FAILURE) ||
            (this._type === STAT_TYPES.HANDSHAKE_SUCCESS);
    }

    static buildStatUpdate(type,params){
        let stat = null;

        switch(type){
            case STAT_TYPES.CONNECTION_SUCCESS:
                stat = StatUpdate._connectionSuccess(params);
                break;
            case STAT_TYPES.CONNECTION_FAILURE:
                stat = StatUpdate._connectionFailure(params);
                break;
            case STAT_TYPES.HANDSHAKE_SUCCESS:
                stat = StatUpdate._handshakeSuccess(params);
                break;
            case STAT_TYPES.HANDSHAKE_FAILURE:
                stat = StatUpdate._handshakeFailure(params);
                break;
            case STAT_TYPES.BLACKLIST:
                stat = StatUpdate._blackList(params);
                break;
            case STAT_TYPES.DEBLACKLIST:
                stat = StatUpdate._deblackList(params);
                break;
        }
        return stat;
    }
    static _validStat(type,params){
        let typeExist = (type.toString() in STAT_TYPES);

        if (!typeExist){
            return false;
        }

        let validParams = statTypeValidator[type](params);
        return validParams;
    }
    static _connectionSuccess(params){
        let type = STAT_TYPES.CONNECTION_SUCCESS;
        return new StatUpdate(type, params);
    }
    static _connectionFailure(params){
        let type = STAT_TYPES.CONNECTION_FAILURE;
        return new StatUpdate(type, params);
    }
    static _handshakeSuccess(params){
        let type = STAT_TYPES.HANDSHAKE_SUCCESS;
        return new StatUpdate(type, params);
    }
    static _handshakeFailure(params){
        let type = STAT_TYPES.HANDSHAKE_FAILURE;
        return new StatUpdate(type, params);
    }
    static _blackList(params){
        let type = STAT_TYPES.BLACKLIST;
        return new StatUpdate(type, params);
    }
    static _deblackList(params){
        let type = STAT_TYPES.DEBLACKLIST;
        return new StatUpdate(type, params);
    }
}

class Stats {

    constructor(){
        this._peerStats = {};
        this._INBOUND = "inbound";
        this._OUTBOUND = "outbound";
    }
    addStat(type,peerB58Id,params){
        let stat = StatUpdate.buildStatUpdate(type,params);

        if(!stat.isValid()){
            return false;
        }

        if(!this.isPeerExist(peerB58Id)){
            this._peerStats[peerB58Id] = [];
        }

        this._peerStats[peerB58Id].push(stat);
        return stat;
    }
    getPeersStats(peerB58Id){
       return this._peerStats[peerB58Id];
    }

    isHandshaked(peerB58Id){
        let stats = this.getPeersStats(peerB58Id);
        let handshaked = false;

        if(stats){
            let grouped = this.getOrderdStatsByType(STAT_TYPES.HANDSHAKE_SUCCESS,peerB58Id);

            if(grouped.length > 0){
                handshaked = true;
            }
        }

        return handshaked;
    }
    /** get all the peers that asked to handshake => inbound
     * @returns {Array} inBound, String idb58 each
     * */
    getAllInBoundHandshakes(){
        return this._getAllBoundTypeHandshakes(this._INBOUND);
    }
    /** get all the peers that were ashed to handshake -> outbound
     * @returns {Array} outBound, String idb58 each
     * */
    getAllOutBoundHandshakes(){
        return this._getAllBoundTypeHandshakes(this._OUTBOUND);
    }
    /** internal - get all outbound,inbound connections
     * @param {String} type, inbound,outbound
     * @returns {Array} @returns {Array} boundPeers, String idb58 each
     * */
    _getAllBoundTypeHandshakes(type){
        let hsPeers = this.getAllHandshakedPeers();
        let boundPeers = [];
        hsPeers.forEach(pid=>{
            if(this.isConnectionTypeHSPeer(pid,type)){
                boundPeers.push(pid);
            }
        });
        return boundPeers;
    }
    /** check weather a peer is inbound/outbound connection or none.
     * @param {String} peerId ,
     * @param {String} type -inbound/outbound
     * @returns {Boolean} true -> equal to type, false otherwise
    */
    isConnectionTypeHSPeer(peerIdb58, type){
        let isBound = false;
        let stats = this._peerStats[peerIdb58];
        if(stats){
            isBound = stats.some(s=>{
                return (s.isHandshake() &&
                    "connectionType" in s.getParams() &&
                    s.getParams()["connectionType"] === type);
            });
            return isBound;
        }
        return isBound;
    }
    /** get all the id's of the peers that performed handshake
     *  @returns {Array} handshaked, array of Strings (b58Id's)
     * */
    getAllHandshakedPeers(){
        let handshakedPeers = [];
        Object.keys(this._peerStats).forEach((peerIdB58)=> {
            if(this.isHandshaked(peerIdB58)){
                handshakedPeers.push(peerIdB58);
            }
        });
        return handshakedPeers;
    }
    /** get all the id's of the peers that performed handshake and are currently connected
     *  @param {Array<String>} activeConnectionsIds , b58 ids
     *  @returns {Array} handshaked, array of Strings (b58Id's)
     * */
    getAllActiveHandshakedPeers(activeConnectionsIds){
        let all = this.getAllHandshakedPeers();
        let intersection = all.filter(p=> activeConnectionsIds.includes(p));
        return intersection;
    }
    getOrderdStatsByType(type,peerB58Id){
        let stats = this.getPeersStats(peerB58Id);
        if(stats){
            let result = [];
            stats.forEach(s=>{
                if(s.getType() === type){
                    result.push(s);
                }
            });
            return result;
        }
        return null;
    }
    isPeerExist(peerIdB58){
        return (peerIdB58 in this._peerStats);
    }
    /** get all the active inbound connections with handshake
     * @param {Array} activeConnectionsIds, list of peer b58 id's from the live dht
     * @returns {Array} peerIds
     * */
    getAllActiveInbound(activeConnectionsIds){
        return this._getAllActiveBoundType(this._INBOUND, activeConnectionsIds);
    }
    /** get all the active outbound connections with handshake
     * @param {Array} activeConnectionsIds, list of peer b58 id's from the live dht
     * @returns {Array} peerIds
     * */
    getAllActiveOutbound(activeConnectionsIds){
        return this._getAllActiveBoundType(this._OUTBOUND, activeConnectionsIds);
    }
    _getAllActiveBoundType(type,activeConnectionsIds){

        if(type !== this._INBOUND && type !== this._OUTBOUND)
            return [];

        let all = this._getAllBoundTypeHandshakes(type);

        let intersection = all.filter(x => activeConnectionsIds.includes(x));

        return intersection;
    }
}


module.exports = Stats;
//
// let j = {
//     "peerInfo" : {},
//     "connectionType" : "outbound",
// };
//
// let j2 = {
//     "peerInfo" : {},
//     "connectionType" : "inbound",
// };
// let s = new Stats();
// s.addStat(STAT_TYPES.HANDSHAKE_SUCCESS, "isanid1", j);
// s.addStat(STAT_TYPES.HANDSHAKE_SUCCESS, "isanid2", j2);
//
// let res = s.isConnectionTypeHSPeer("isanid1","outbound");
//
// console.log("res " + res);
//
// let ss = s.getAllInBoundHandshakes();
// let ss2 = s.getAllOutBoundHandshakes();
//
// console.log(ss)
// console.log(ss2)
// console.log('00')
// let rr = s.getAllActiveInbound([1,2,4,"isanid1", "isanid2"])
// console.log(rr);
// rr = s.getAllActiveOutbound([1,2,4,"isanid1", "isanid2"])
// console.log(rr);
