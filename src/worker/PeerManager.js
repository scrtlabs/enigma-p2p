/** This module is responsible for Managing Peers nodes.*/
const EventEmitter = require('events').EventEmitter;
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const PeerBundle = require('./libp2p-bundle');
const Pushable = require('pull-pushable');

class PeerManager extends EventEmitter{
    /**
     * {
     *  getpeersconnections
     * }
    * */
    constructor(nodeBundle){
        super();
        this.node = nodeBundle;
    }
    /** Get all peers peer list
     * @returns {PeerInfo} , peerInfo of the local Node*/
    getSelfPeerInfo(){
        return this.node.peerInfo;
    }
    /** Get the peers (connections) list of a given Peer.*/
    getPeersConnections(peerInfo,onConnection){
        this.node.dialProtocol(peerInfo,"proto name", onConnection);
    }

}

module.exports = PeerManager;


