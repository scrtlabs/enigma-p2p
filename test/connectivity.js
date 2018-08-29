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
 * The test spawns 2 nodes Dns and Worker.
 * The test uses the Discovery algorithm of libp2p to help the Dialer find the Listener
 * The worker connects to the dns*/

it('#1 Should connect to a boostrap node and perform echo', async function(){

    if(!TEST_TREE['connectivity']['all'] || !TEST_TREE['connectivity']['#1']){
        this.skip();
    }

    return new Promise(async (resolve)=>{
        // configuration params
        let isDns = true;
        let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
        let worker = utils.quickWorker(!isDns);
        let dns = utils.quickWorker(isDns);
        // handlers
        let protocols = ['/echo','/handshake/0.1'];
        let handlerDns = new ProtocolHandler();
        let handlerWorker = new ProtocolHandler();
        // init dns
        await dns.syncInit(pathDns);
        await dns.syncStart();
        dns.addHandlers(protocols,handlerDns);
        // init worker
        await worker.syncInit();
        await worker.syncStart();
        worker.addHandlers(protocols,handlerWorker);
        // stop the nodes
        setTimeout( ()=>{
            //verify that the worker is connected
            assert.equal(1, worker.getAllPeersInfo().length,"error in peers len ");
            // send ehco
            worker.dialProtocol(dns.getSelfPeerInfo(),'/echo',(p,con)=>{
                // send msg
                pull(
                    pull.values([Buffer.from('42')]),
                    con,
                    pull.collect(async (err,response)=>{
                        assert.equal(null,err);
                        // verify the echo equals
                        let echoAnswer = response.toString('utf8');
                        assert.equal('42',echoAnswer, "err in value returned from echo");
                        // close
                        await worker.syncStop();
                        await dns.syncStop();
                        resolve();
                    })
                );
            });
        },1000);
    });
});



it('#2 Should test pubsub = broadcast', async function(){

    if(!TEST_TREE['connectivity']['all'] || !TEST_TREE['connectivity']['#2']){
        this.skip();
    }

    return new Promise(async resolve=>{
        let isDns = true;
        let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
        let protocols = ['/echo','/handshake/0.1'];

        // initiate boostrap node

        let dns = utils.quickWorker(isDns);
        let handlerDns = new ProtocolHandler();
        await dns.syncInit(pathDns);
        await dns.syncStart();
        dns.addHandlers(protocols,handlerDns);

        // initiate worker node

        let worker = utils.quickWorker(!isDns);
        let handlerWorker = new ProtocolHandler();
        await worker.syncInit();
        await worker.syncStart();
        worker.addHandlers(protocols,handlerWorker);

        // perform handshake

        resolve();
    });
});