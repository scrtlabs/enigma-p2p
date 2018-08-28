/** Policy class that handles messages policy*/
const EventEmitter = require('events').EventEmitter
const PROTOCOLS = require('../common/constants').PROTOCOLS;


class Policy extends EventEmitter{
    constructor(){
        super();
    }
    /** Validate peer
     * @param peerInfo the peer info
     * @param policyBundle contains the pong message from the peer
     * @returns {Boolean}
     * */
    isValidPeer(peerInfo, policyBundle){
        return true;
    }
    /** Validate all protocols configured
     * @param {Array} registeredProtocols, list of protocol names
     * @returns {Boolean} true if valid false otherwise
     * */
    validateProtocols(registeredProtocols){

        let shouldExist = Object.values(PROTOCOLS);

        if (shouldExist.length > registeredProtocols.length)
            return false;

        let missingValue = shouldExist.some(p=>{
            if(registeredProtocols.indexOf(p) < 0){
                return true;
            }
        });
        return !missingValue;
    }
    validJsonRpc(msg){
        let keys = Object.keys(msg);
        return "jsonrpc" in keys &&
            "method" in keys &&
            ("params" in keys  || "result" in keys) &&
            "id" in keys;
    }

}

module.exports = Policy;