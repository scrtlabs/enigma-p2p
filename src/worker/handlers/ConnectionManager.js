const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const Policy = require('../../policy/policy');
const constants = require('../../common/constants');
const PROTOCOLS = constants.PROTOCOLS;
const STATUS = constants.STATUS;
const nodeUtils = require('../../common/utils');
const Messages = require('../../policy/messages');

class ConnectionManager{

    constructor(enigmaNode, policy){
        this._enigmaNode = enigmaNode;
        this._isDiscovering = false;
        this._policy = policy;
    }
    isDiscovering(){
        return this._isDiscovering;
    }
    /**Send a heart-beat to some peer
     * @params {PeerInfo} peer, could be string b58 id as well
     * @returns {Promise} Heartbeat result
     * */
    sendHeartBeat(peer){
        return new Promise((resolve,reject)=>{

            let peerInfo;

            if(nodeUtils.isString(peer)){
                // TODO:: create PeerInfo from B58 id
                throw {name : "NotImplementedError", message : "too lazy to implement"};

            }else{
                // PeerInfo
                peerInfo = peer;
            }
            // build the msg
            let heartBeatRequest = new Messages.HeartBeatReqMsg({
                "from" : this._enigmaNode.getSelfIdB58Str(),
                "to" : peerInfo.id.toB58String(),
            });
            if(!heartBeatRequest.isValidMsg()){
                // TODO:: Add logger.
                console.log("[-] Err in HBReq msg ");
            }
            // send the request
            this._enigmaNode.dialProtocol(peerInfo,PROTOCOLS['HEARTBEAT'],(protocol,conn)=>{

                pull(
                    pull.values([heartBeatRequest.toNetworkStream()]),
                    conn,
                    pull.collect((err,response)=>{
                        if(err) {
                            //TODO:: add Logger
                            console.log("[-] Err in collecting HBRes msg",err);
                            reject(err);
                        }else{
                            // validate HeartBeat Message response
                            let heartBeatRes = nodeUtils.toHeartBeatResMsg(response);
                            if(heartBeatRes.isCompatibleWithMsg(heartBeatRequest)){
                                // TODO:: validate ID equals in response, valid connection (possibly do nothing)
                                // TODO:: Add to stats (?)
                                resolve(heartBeatRes);
                            }else{
                                //TODO:: The heartbeat message failed (weird) why? wrong id?
                                //TODO:: anyway, drop the message and do something in response.
                                //TODO:: maybe drop the peer (?)
                                //TODO:: add Logger
                                reject(err);
                            }
                        }
                    })
                );
            });

        });

    }

}

module.exports = ConnectionManager;