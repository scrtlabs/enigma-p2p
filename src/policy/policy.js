/** Policy class that handles messages policy*/
const EventEmitter = require('events').EventEmitter
const PROTOCOLS = require('../common/constants').PROTOCOLS;


class Policy extends EventEmitter{
    constructor(){
        super();
        this.version = "0.1";
    }
    policyVersion(){
        return this.version;
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
    /** is a valid procol name
     * @param {String} protocolName,
     * @returns {Boolean}, is valid protocol
     * */
    isValidProtocol(protocolName){
        for (let key in PROTOCOLS){
            if(PROTOCOLS[key] == protocolName)
                return true;
        }
        return false;
    }
    /** Validate JSON RPC message type
     * @param {Json} msg, some json
     * @returns {Boolean} isValid
     * */
    validJsonRpc(msg){
        return  'jsonrpc' in msg &&
                (('method' in msg && 'params') || 'result' in msg ) &&
                'id' in msg;
    }

}

module.exports = Policy;