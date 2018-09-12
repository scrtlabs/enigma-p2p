const parallel = require('async/parallel');
const EnigmaNode = require('../../../src/worker/EnigmaNode');
const utils = require('../../utils');
const quickBuilderUtil = require('../../quickBuilderUtil');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const Policy = require('../../../src/policy/policy');
const ProtocolHandler = require('../../../src/worker/handlers/ProtcolHandler');
const ConnectionManager = require('../../../src/worker/handlers/ConnectionManager');
const consts = require('../../../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const TEST_TREE = require('../../test_tree').TEST_TREE;
const NodeController = require('../../../src/worker/NodeController');
async function test1(){
    // configurations
    let peerOptions = quickBuilderUtil.getDefaultOptions();
    peerOptions.nickname = "peer";
    let peer = quickBuilderUtil.quickWorker(peerOptions);
    let dnsOptions = quickBuilderUtil.getDefaultOptions();
    dnsOptions.port = '10333';
    dnsOptions.nickname = "dns";
    let bNode = quickBuilderUtil.quickWorker(dnsOptions);
    // initialize the controller
    let pConMan = new ConnectionManager(peer,new Policy());
    let peerController = new NodeController(peer,peer.getProtocolHandler(),pConMan);
    // run nodes
    await bNode.syncRun();
    await utils.sleep(1000*2);
    await peer.syncRun();
    setTimeout(async ()=>{
        console.log("shutting down...");
        await bNode.syncStop();
        await peer.syncStop();
    }, 1000*6);
}

test1();