const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const NodeBundle = require('../src/worker/libp2p-bundle');
const EngNode = require('../src/worker/EnigmaNode');
const nodeUtils = require('../src/common/utils');
const Pushable = require('pull-pushable')


module.exports.buildWorker = function(port,listenerPort,ListenerId){
    return _buildWorker(port,listenerPort,ListenerId);
};
function _buildWorker(port,listenerPort,ListenerId,nickname){
    let multiAddrs = ['/ip4/0.0.0.0/tcp/'+port];
    let dnsNodes = ['/ip4/0.0.0.0/tcp/'+listenerPort+'/ipfs/'+ListenerId];
    let doDiscovery = true;
    // if(port != '0'){
    //     dnsNodes = [];
    // }
    let worker = new EngNode(multiAddrs, doDiscovery, dnsNodes,nickname);
    return worker;
}
const pushStream = Pushable()
let NaiveHandlers = {
    'peer:discovery' : (node,peer)=>{node.dial(peer,()=>{});},
    'peer:connect' : (node,peer)=>{console.log('[Connection with '+ miniId(node.peerInfo.id.toB58String())+'] from : ' + miniId(peer.id.toB58String()));},
    '/echo' : (protocol,conn) =>{
        pull(conn,conn);
    },
    '/getpeerbook' : (selfBundleInstance, params) =>{
        let selfNode = params.worker;
        let peers = selfNode.getAllPeersInfo();
        let parsed = nodeUtils.parsePeerBook(peers);
        // stream back the connection
        pull(
            pull.values([JSON.stringify({"from" : miniId(selfNode.getSelfPeerInfo().id.toJSON()),"peers" : parsed})]),
            params.connection
        );
    },
    '/groupdial' : (selfNodeNundle, params)=>{
        let connection = params.connection;
        let selfWorker = params.worker;
        // handle the message recieved from the dialing peer.
        console.log(miniId(selfWorker.getSelfPeerInfo().id.toB58String()) +  ' => got a groupdial from : ');
        //TODO:: got a dial from remote peer
        pull(
            connection,
            connection
        );
    },
    '/mailbox' : (selfNodeBundle, params)=>{
        // both send and recieve
        let connection = params.connection;
        // from self to remote
        pull(
            pushStream,
            connection
        );
        process.stdin.setEncoding('utf8');
        process.openStdin().on('data', (chunk)=>{
            var data = chunk.toString();
            pushStream.push(data);
        });
        // from remote to self
        pull(
          connection,
          pull.map((data)=>{
              return data.toString('utf8').replace('\n', '')
          }),
            pull.drain(console.log)
        );
    }
};

module.exports.NaiveHandlers = NaiveHandlers;

module.exports.sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

function miniId(id){
    if(typeof id == typeof "string")
        return id.substring(0,2) + id.substring(id.length-2,id.length);
    else
        return id;
};


module.exports.startNode = function(type,protocols,handler,callback){
    let nodeDns, nodePeer;
    let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    switch(type){
        case 'dns' :
            nodeDns = utils.buildWorker(portDialer,portDns,idDns);
            nodeDns.loadNode(pathDns,()=>{
                nodeDns.start(()=>{
                    nodeDns.addHandlers(protocols,handler);
                    setTimeout(()=>{
                        callback(nodeDns);
                    },100);
                });
            });
            break;
        case 'worker' :
            nodePeer = utils.buildWorker(portDialer,portDns,idDns);
            nodePeer.createNode(err=>{
                assert.equal(null,err,"error creating peer node.");
                nodePeer.start(()=>{
                    nodePeer.addHandlers(protocols,handler);
                    setTimeout(()=>{
                        callback(nodePeer);
                    },100);
                });
            });
            break;
    }
};

// quickly setup a worker
module.exports.quickWorker = function(isDns,nickname) {
    let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    if(!isDns){
        return _buildWorker(portDialer,portDns,idDns,nickname);
    }else{
        return _buildWorker(portDns,portDns,idDns,nickname);
    }
};

