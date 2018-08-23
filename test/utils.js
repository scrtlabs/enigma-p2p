const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const NodeBundle = require('../src/worker/libp2p-bundle');
const EngNode = require('../src/worker/EnigmaNode');
const nodeUtils = require('../src/common/utils');

module.exports.buildWorker = function(port,listenerPort,ListenerId){
        let multiAddrs = ['/ip4/0.0.0.0/tcp/'+port];
        let dnsNodes = ['/ip4/0.0.0.0/tcp/'+listenerPort+'/enigma/'+ListenerId];
        let doDiscovery = true;
        let worker = new EngNode(multiAddrs, doDiscovery, dnsNodes);
        return worker;
};

let NaiveHandlers = {
    'peer:discovery' : (node,peer)=>{node.dial(peer,()=>{});},
    'peer:connect' : (node,peer)=>{console.log('[Connection with '+ node.peerInfo.id.toB58String()+'] from : ' + peer.id.toB58String());},
    '/echo' : (protocol,conn) =>{
        pull(conn,conn);
    },
    '/getpeerbook' : (selfBundleInstance, params) =>{
        let selfNode = params.worker;
        let peers = selfNode.getAllPeersInfo();
        let parsed = nodeUtils.parsePeerBook(peers);
        // stream back the connection
        pull(
            pull.values([JSON.stringify({"from" : selfNode.getSelfPeerInfo().id.toJSON(),"peers" : parsed})]),
            params.connection
        );

    }
};

module.exports.NaiveHandlers = NaiveHandlers;

module.exports.sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};