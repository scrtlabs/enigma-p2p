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
const NodeController = require('../src/worker/NodeController');

const B1Path = "/home/wildermind/WebstormProjects/enigma-p2p/test/testUtils/id-l";
const B1Port = "10300";
const B2Path = "/home/wildermind/WebstormProjects/enigma-p2p/test/testUtils/id-d";
const B2Port = "103001";

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



it('#1 Should test handshake with 1 node', async function(){
    let tree = TEST_TREE['basic'];
    if(!tree['all'] || !tree['#2']){
        this.skip();
    }

    return new Promise(async (resolve)=>{

        let dnsController = NodeController.initDefaultTemplate({"port":B1Port, "idPath" : B1Path, "nickname":"dns"});
        let peerController = NodeController.initDefaultTemplate({"nickname":"peer"});

        await dnsController._enigmaNode.syncRun();

        await testUtils.sleep(1000);

        await peerController._enigmaNode.syncRun();

        await testUtils.sleep(1000);


        resolve();
    });
});












