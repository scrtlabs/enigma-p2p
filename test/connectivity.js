const parallel = require('async/parallel');
const EnigmaNode = require('../src/worker/EnigmaNode');
const utils = require('./utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const Policy = require('../src/policy/policy');
const ProtocolHandler = require('../src/worker/handlers/ProtcolHandler');
const ConnectionManager = require('../src/worker/handlers/ConnectionManager');
const consts = require('../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const TEST_TREE = require('./test_tree').TEST_TREE;
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
        let protocols = [PROTOCOLS['ECHO'],PROTOCOLS['HANDSHAKE']];
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
            worker.dialProtocol(dns.getSelfPeerInfo(),PROTOCOLS['ECHO'],(p,con)=>{
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
        },1000*3);
    });
});

it('#2 should test Boostrap and 5 peers initial discovery', async function(){

    if(!TEST_TREE['connectivity']['all'] || !TEST_TREE['connectivity']['#2']){
        this.skip();
    }

    return new Promise(async (resolve)=>{
            // configuration params
            let isDns = true;
            let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
            let protocols = [PROTOCOLS['ECHO'],PROTOCOLS['HANDSHAKE']];

            let boostrap= utils.quickWorker(isDns, "DNS");
            let p1 = utils.quickWorker(!isDns, "p1");
            let p2 = utils.quickWorker(!isDns, "p2");
            let p3 = utils.quickWorker(!isDns, "p3");
            let p4 = utils.quickWorker(!isDns, "p4");
            let p5 = utils.quickWorker(!isDns, "p5");
            // handlers
            await boostrap.syncInit(pathDns);
            await boostrap.syncStart();
            boostrap.addHandlers(protocols,new ProtocolHandler());
            await utils.sleep(1000);
            // init workers
            await p1.syncInit();
            await p2.syncInit();
            await p3.syncInit();
            await p4.syncInit();
            await p5.syncInit();
            // start workers
            await p1.syncStart();
            await p2.syncStart();
            await p3.syncStart();
            await p4.syncStart();
            await p5.syncStart();
            // add handlers
            p1.addHandlers(protocols,new ProtocolHandler());
            p2.addHandlers(protocols,new ProtocolHandler());
            p3.addHandlers(protocols,new ProtocolHandler());
            p4.addHandlers(protocols,new ProtocolHandler());
            p5.addHandlers(protocols,new ProtocolHandler());
            await utils.sleep(1000 * 6);
            // verify connections
            assert.equal(1,p1.getAllPeersInfo().length,"p1 wrong number of peers.");
            assert.equal(1,p2.getAllPeersInfo().length,"p2 wrong number of peers.");
            assert.equal(1,p3.getAllPeersInfo().length,"p3 wrong number of peers.");
            assert.equal(1,p4.getAllPeersInfo().length,"p4 wrong number of peers.");
            assert.equal(1,p5.getAllPeersInfo().length,"p5 wrong number of peers.");
            assert.equal(5,boostrap.getAllPeersInfo().length,"boostrap wrong number of peers.");
            // stop the nodes
            await p1.syncStop();
            await p2.syncStop();
            await p3.syncStop();
            await p4.syncStop();
            await p5.syncStop();
            await boostrap.syncStop();
            resolve();
    });
});


it('#3 should test /getpeekbook', async function(){

    if(!TEST_TREE['connectivity']['all'] || !TEST_TREE['connectivity']['#3']){
        this.skip();
    }

    return new Promise(async (resolve)=>{
        // configuration params
        let isDns = true;
        let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
        let protocols = [PROTOCOLS['ECHO'],PROTOCOLS['HANDSHAKE'], PROTOCOLS['PEERS_PEER_BOOK']];

        let boostrap= utils.quickWorker(isDns, "DNS");
        let p1 = utils.quickWorker(!isDns, "p1");
        let p2 = utils.quickWorker(!isDns, "p2");

        // handlers
        await boostrap.syncInit(pathDns);
        await boostrap.syncStart();
        boostrap.addHandlers(protocols,new ProtocolHandler());
        await utils.sleep(1000);
        // init workers
        await p1.syncInit();
        await p2.syncInit();
        // start workers
        await p1.syncStart();
        await p2.syncStart();
        // add handlers
        p1.addHandlers(protocols,new ProtocolHandler());
        p2.addHandlers(protocols,new ProtocolHandler());
        await utils.sleep(1000 * 4);
        // verify 3 peers on boostrap node
        let boostrapPeerBook = await p1.syncGetPeersPeerBook(boostrap.getSelfPeerInfo());
        assert.equal(2,boostrapPeerBook.peers.length,'error in bootstrap peer book');
        // stop the nodes
        await p1.syncStop();
        await p2.syncStop();
        await boostrap.syncStop();
        resolve();
    });
});


it('#4 should test /heartbeat', async function(){

    if(!TEST_TREE['connectivity']['all'] || !TEST_TREE['connectivity']['#4']){
        this.skip();
    }

    return new Promise(async (res,rej)=>{
        // configuration params
        let isDns = true;
        let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
        let protocols = [PROTOCOLS['ECHO'],PROTOCOLS['HANDSHAKE'], PROTOCOLS['PEERS_PEER_BOOK'],PROTOCOLS['HEARTBEAT']];

        let boostrap= utils.quickWorker(isDns, "DNS");
        let peer = utils.quickWorker(!isDns, "peer");
        // connection manager
        let conManagerPeer = new ConnectionManager(peer,new Policy());
        let conManagerBoot = new ConnectionManager(boostrap,new Policy());
        // handlers
        await boostrap.syncInit(pathDns);
        await boostrap.syncStart();
        boostrap.addHandlers(protocols,new ProtocolHandler());
        await utils.sleep(1000);
        // init workers
        await peer.syncInit();
        await peer.syncStart();
        peer.addHandlers(protocols,new ProtocolHandler());
        await utils.sleep(1000 * 4);
        // send heart beat
        let hbRes = await conManagerPeer.sendHeartBeat(boostrap.getSelfPeerInfo());
        // compare
        assert.equal(true,hbRes.isValidMsg(), "err hb response not valid");
        assert.equal(peer.getSelfIdB58Str(), hbRes.to());
        // stop the nodes
        await peer.syncStop();
        await boostrap.syncStop();
        res();
    });
});


it('#5 should get A DNS Seeds', async function(){

    if(!TEST_TREE['connectivity']['all'] || !TEST_TREE['connectivity']['#5']){
        this.skip();
    }

    return new Promise(async (res,rej)=>{
        let env = await utils.loadInitialEnv();
        console.log("in test scope...");
        let peers = env.peers;
        let b1 = env.b1;
        let b2 =  env.b2;
        let newWorker = env.newWorker;

        // TODO:: replace prints with assertions
        console.log("b1 peers # " + b1.getAllPeersInfo().length);// assert 3
        console.log("b2 peers # " + b2.getAllPeersInfo().length);// assert 3
        console.log("newWorker peers # " + newWorker.getAllPeersInfo().length); // assert 2
        for(let i =0; i<peers.length;++i){
            console.log("p" +(i+1)+" peers #  " + peers[i].getAllPeersInfo().length); // assert 1
        }

        // TODO:: Run the i test.
        // TODO:: General : add handshake to each connection even now with the DNS and all the peers in the background.
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
});