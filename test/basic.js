const path = require('path')
const parallel = require('async/parallel');
const EnigmaNode = require('../src/worker/EnigmaNode');
const quickBuilderUtils = require('./testUtils/quickBuilderUtil');
const testUtils = require('./testUtils/utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const Policy = require('../src/policy/policy');
const ProtocolHandler = require('../src/worker/handlers/ProtcolHandler');
const ConnectionManager = require('../src/worker/handlers/ConnectionManager');
const consts = require('../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const TEST_TREE = require('./test_tree').TEST_TREE;
const WorkerBuilder = require('../src/worker/builder/WorkerBuilder');
const NodeController = require('../src/worker/controller/NodeController');

const B1Path = path.join(__dirname,"testUtils/id-l");
const B1Port = "10300";
const B2Path = "../../test/testUtils/id-d";
const B2Port = "10301";


it('#1 Should test the worker builder', async function(){
    let tree = TEST_TREE['basic'];
    if(!tree['all'] || !tree['#1']){
        this.skip();
    }

    return new Promise(async (resolve)=>{

        // load configs
        let c = WorkerBuilder.loadConfig();
        // change defaults
        c.nickname = "worker";
        c.idPath = B1Path;
        // build the worker
        let worker = WorkerBuilder.build(c);
        // start the worker
        await worker.syncRun();

        await testUtils.sleep(1000);
        assert.equal(0, worker.getAllPeersInfo().length, "peer info don't match " );
        // stop the worker
        await worker.syncStop();
        resolve();

    });
});



it('#2 Should test handshake with 1 node', async function(){
    let tree = TEST_TREE['basic'];
    if(!tree['all'] || !tree['#2']){
        this.skip();
    }
    return new Promise(async (resolve)=>{
        let bootstrapNodes = ["/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm"];
        let dnsController = NodeController.initDefaultTemplate({"port":B1Port, "idPath":B1Path, "nickname":"dns", "bootstrapNodes":bootstrapNodes});
        let peerController = NodeController.initDefaultTemplate({"nickname":"peer" , "bootstrapNodes":bootstrapNodes});

        await dnsController.engNode().syncRun();

        await testUtils.sleep(2000);

        await peerController.engNode().syncRun();

        await testUtils.sleep(4000);

        let peersLen = peerController.engNode().getAllPeersInfo().length;

        assert.equal(1,peersLen, "error in peers len should be 1");

        // validate handshake on the peer side
        let handshakedPeers = peerController.stats().getAllHandshakedPeers();

        assert.equal(1,handshakedPeers.length);
        assert.equal(dnsController.engNode().getSelfIdB58Str(), handshakedPeers[0]);

        // validate handshake on the dns side
        handshakedPeers = dnsController.stats().getAllHandshakedPeers();

        assert.equal(1,handshakedPeers.length);
        assert.equal(peerController.engNode().getSelfIdB58Str(), handshakedPeers[0]);

        await dnsController.engNode().syncStop();
        await peerController.engNode().syncStop();
        resolve();
    });
});












