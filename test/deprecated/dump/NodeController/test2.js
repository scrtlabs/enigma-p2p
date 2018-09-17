const parallel = require('async/parallel');
const EnigmaNode = require('../../../../src/worker/EnigmaNode');
const utils = require('../../utils');
const quickBuilderUtil = require('../../quickBuilderUtil');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const Policy = require('../../../../src/policy/policy');
const ProtocolHandler = require('../../../../src/worker/handlers/ProtcolHandler');
const ConnectionManager = require('../../../../src/worker/handlers/ConnectionManager');
const consts = require('../../../../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const TEST_TREE = require('../../test_tree').TEST_TREE;
const NodeController = require('../../../../src/worker/controller/NodeController');
async function test2(){
    // configurations
    // peer 1
    let peerOptions = quickBuilderUtil.getDefaultOptions();
    peerOptions.nickname = "peer1";
    let peer = quickBuilderUtil.quickWorker(peerOptions);
    // peer 2 - the requester
    let peer2Opts = quickBuilderUtil.getDefaultOptions();
    peer2Opts.nickname = "peer2";
    let peer2 = quickBuilderUtil.quickWorker(peer2Opts);
    // dns - the responder
    let dnsOptions = quickBuilderUtil.getDefaultOptions();
    dnsOptions.port = '10333';
    dnsOptions.nickname = "dns";
    let bNode = quickBuilderUtil.quickWorker(dnsOptions);
    // initialize the controller p1
    let pConMan = new ConnectionManager(peer,new Policy());
    let peerController = new NodeController(peer,peer.getProtocolHandler(),pConMan);
    // run nodes
    await bNode.syncRun();
    await utils.sleep(1000*2);
    await peer.syncRun();
    await utils.sleep(1000*3);
    // connect with peer2
    let p2ConMan = new ConnectionManager(peer2,new Policy());
    let p2Controller = new NodeController(peer,peer.getProtocolHandler(),pConMan);
    await peer2.syncRun();
    await utils.sleep(1000*4);
    p2ConMan.findPeersRequest(bNode.getSelfPeerInfo(),0);
    await utils.sleep(1000*2);
    setTimeout(async ()=>{
        console.log("shutting down...");
        await bNode.syncStop();
        await peer.syncStop();
        await peer2.syncStop();
    }, 1000*6);
}

test2();