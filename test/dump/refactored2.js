const parallel = require('async/parallel');
const EnigmaNode = require('../../src/worker/EnigmaNode');
const utils = require('../utils');
const quickBuilderUtil = require('../quickBuilderUtil');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const Policy = require('../../src/policy/policy');
const ProtocolHandler = require('../../src/worker/handlers/ProtcolHandler');
const ConnectionManager = require('../../src/worker/handlers/ConnectionManager');
const consts = require('../../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const TEST_TREE = require('../test_tree').TEST_TREE;


function run(){


    return new Promise(async (res,rej)=>{
        let envOptions = quickBuilderUtil.createEnvOptions()
            , nodes = quickBuilderUtil.createEnviornment(envOptions)
            , b1 = nodes[0]
            , b2 = nodes[1]
            , peers = nodes.slice(2,6)
            , newWorker = nodes[nodes.length-1];

        await quickBuilderUtil.runNodesInOrder(nodes);
        await utils.sleep(2000);
        // validate all connections are estavlished.
        assert.equal(3,b1.getAllPeersInfo().length, "b1 not established peers");
        assert.equal(3,b2.getAllPeersInfo().length, "b2 not established peers");
        assert.equal(2,newWorker.getAllPeersInfo().length, "newWorker not established peers");
        for(let i =0; i<peers.length;++i){
            assert.equal(1,peers[i].getAllPeersInfo().length, "peer not established peers");
        }

        // TODO:: request peers from bootstrap nodes.
        // TODO:: assert the total amount of peers
        // TODO:: and DONE.
        // TODO:: test #6 should test handshake process

        // stop the env
        //TODO:: Change here the test to waterfall because each stop might finish after res() and fail the test !!!
        await newWorker.syncStop();
        peers.forEach(async p=>{
            await p.syncStop();
        });
        await b1.syncStop();
        await b2.syncStop();
        res();
    });
}



run();
