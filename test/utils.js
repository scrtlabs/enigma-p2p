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
const consts = require('../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const ProtocolHandler = require('../src/worker/handlers/ProtcolHandler');
// Load enviornment
// load 1 Worker, 2 DNS, 4 peers (2 for each DNS)
module.exports.loadInitialEnv =  function(){
    return new Promise(async (resolve,rej)=>{
// configuration params
        let isDns = true;
        let pathB1 = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
        let pathB2 = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-d';
        let idB1 = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
        let idB2 = 'Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';
        let iB1= {'id':idB1,'port' : '10333'};
        let iB2 = {'id':idB2,'port' : '10334'};

        let protocols = [PROTOCOLS['ECHO'],PROTOCOLS['HANDSHAKE'], PROTOCOLS['PEERS_PEER_BOOK'],PROTOCOLS['HEARTBEAT']];
        // create node instances
        //boostrap
        //isDns,portDns,idDns,nickname
        let b1 = _internal_quickWorker(isDns,"10333",idB1,"B1");
        let b2 = _internal_quickWorker(isDns,"10334",idB2,"B2");
        // 4 peers
        let p1 = _internal_buildWorkers([iB1],"p1");
        let p2 = _internal_buildWorkers([iB1],"p2");
        let p3 = _internal_buildWorkers([iB2],"p3");
        let p4 = _internal_buildWorkers([iB2],"p4");

        // start the bootstrap nodes
        await b1.syncInit(pathB1);
        await b2.syncInit(pathB2);
        await b1.syncStart();
        b1.addHandlers(protocols,new ProtocolHandler());
        await _sleep(200);
        await b2.syncStart();
        b2.addHandlers(protocols,new ProtocolHandler());

        await _sleep(200);

        // init the peers (4)
        await p1.syncInit();
        await p2.syncInit();
        await p3.syncInit();
        await p4.syncInit();

        // start workers
        await p1.syncStart();
        await p2.syncStart();
        await p3.syncStart();
        await p4.syncStart();

        // add handlers
        p1.addHandlers(protocols,new ProtocolHandler());
        p2.addHandlers(protocols,new ProtocolHandler());
        p3.addHandlers(protocols,new ProtocolHandler());
        p4.addHandlers(protocols,new ProtocolHandler());
        await _sleep(200);

        // the local node - worker
        let newWorker = _internal_buildWorkers([iB1,iB2],"newWorker");
        await newWorker.syncInit();
        await newWorker.syncStart();
        newWorker.addHandlers(protocols,new ProtocolHandler());
        await _sleep(1000*3);
        console.log("returning");
        resolve({'newWorker' : newWorker, 'b1' : b1, 'b2' : b2 , 'peers' : [p1,p2,p3,p4]});
    });
};
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
    return _sleep(ms);
};
function _sleep(ms){
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
    return _internal_quickWorker(isDns,portDns,idDns,nickname);
};
// for setting up more than 1 DNS
function _internal_quickWorker(isDns,portDns,idDns,nickname) {
    let portDialer = '0';
    if(!isDns){
        return _buildWorker(portDialer,portDns,idDns,nickname);
    }else{
        return _buildWorker(portDns,portDns,idDns,nickname);
    }
};

// for setting up workers when there's more than 1 dns
// bNode[port,id]
function _internal_buildWorkers(bNodes,nickName){
    const doDiscovery = true;
    let multiAddrs = ['/ip4/0.0.0.0/tcp/0'];
    let dnsAddrs = [];
    bNodes.forEach(b=>{
        dnsAddrs.push('/ip4/0.0.0.0/tcp/'+b.port+'/ipfs/'+b.id);
    });
    return new EngNode(multiAddrs, doDiscovery,dnsAddrs,nickName);
}

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