const parallel = require('async/parallel');
const EnigmaNode = require('../src/worker/EnigmaNode');
const utils = require('./utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const TEST_TREE = require('./test_tree').TEST_TREE;
const ProtocolHandler = require('../src/worker/handler/ProtcolHandler');
const SEC = 1000;
/**
 * Test Description:
 * The test spawns 2 nodes Dialer and Listener.
 * The test uses the Discovery algorithm of libp2p to help the Dialer find the Listener
 * The dialer connects to the listener*/

if(TEST_TREE['connectivity']['all'])
it('Should connect to a boostrap node', async function(){
    // configuration params
    let isDns = true;
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let worker = utils.quickWorker(!isDns);
    let dns = utils.quickWorker(isDns);
    // handlers
    let protocols = ['/echo'];
    let handlerDns = new ProtocolHandler();
    let handlerWorker = new ProtocolHandler();
    // init dns
    await dns.syncInit(pathDns);
    await dns.syncStart();
    dns.addHandlers(protocols,handlerDns.handle);
    // init worker
    await worker.syncInit();
    await worker.syncStart();
    worker.addHandlers(protocols,handlerWorker.handle);
    // stop the nodes
    await worker.syncStop();
    await dns.syncStop();
});

