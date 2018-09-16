const parallel = require('async/parallel');
const EnigmaNode = require('../../../../src/worker/EnigmaNode');
const utils = require('../../utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const ProtocolHandler = require('../../../../src/worker/handlers/ProtcolHandler');

async function run(){
    // configuration params
    let isDns = true;
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let protocols = ['/echo','/handshake/0.1'];

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
    await utils.sleep(1000);
    // stop the nodes
    setTimeout(async ()=>{
        // verify connections
        console.log('>>> ---------------------------- <<< ');

        console.log("p1 connected to : " + p1.getAllPeersInfo().length+ ' -> '+  p1.getAllPeersInfo()[0].id.toB58String());
        console.log("p2 connected to : " + p2.getAllPeersInfo().length+ ' -> '+ p2.getAllPeersInfo()[0].id.toB58String());
        console.log("p3 connected to : " + p3.getAllPeersInfo().length+ ' -> '+ p2.getAllPeersInfo()[0].id.toB58String());
        console.log("p4 connected to : " + p4.getAllPeersInfo().length+ ' -> '+ p2.getAllPeersInfo()[0].id.toB58String());
        console.log("p5 connected to : " + p5.getAllPeersInfo().length+ ' -> '+ p2.getAllPeersInfo()[0].id.toB58String());
        console.log("boostrap connected to : " + boostrap.getAllPeersInfo().length+ ' -> ');
        boostrap.getAllPeersInfo().forEach(p=>{
            console.log(p.id.toB58String());
        });

        console.log('>>> ---------------------------- <<< ');
        await p1.syncStop();
        await p2.syncStop();
        await p3.syncStop();
        await p4.syncStop();
        await p5.syncStop();
        await boostrap.syncStop();
    },1000 * 5);
}

run();