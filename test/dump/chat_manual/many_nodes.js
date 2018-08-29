const parallel = require('async/parallel');
const EnigmaNode = require('../../../src/worker/EnigmaNode');
const utils = require('../../utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const ProtocolHandler = require('../../../src/worker/handler/ProtcolHandler');

async function run(){
    // configuration params
    let isDns = true;
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let boostrap= utils.quickWorker(isDns, "DNS");
    let hanp1 = new ProtocolHandler();
    let hanp2 = new ProtocolHandler();
    let handns =new ProtocolHandler();
    let p1 = utils.quickWorker(!isDns, "p1");
    let p2 = utils.quickWorker(!isDns, "p2");
    // let p3 = utils.quickWorker(!isDns, "p3");
    // let p4 = utils.quickWorker(!isDns, "p4");
    // let p5 = utils.quickWorker(!isDns, "p5");
    // handlers
    let protocols = ['/echo','/handshake/0.1'];
    await boostrap.syncInit(pathDns);
    await boostrap.syncStart();
    boostrap.addHandlers(protocols,handns);
    await utils.sleep(1000);
    // init dns
    // await boostrap.syncInit(pathDns);
    // await boostrap.syncStart();
    // boostrap.addHandlers(protocols,new ProtocolHandler());
    // await utils.sleep(1000);
    // init workers
    await p1.syncInit();
    await p2.syncInit();
    // await p3.syncInit();
    // await p4.syncInit();
    // await p5.syncInit();
    // start workers
    await p1.syncStart();
    await p2.syncStart();
    // await p3.syncStart();
    // await p4.syncStart();
    // await p5.syncStart();
    // add handlers
    p1.addHandlers(protocols,hanp1);
    p2.addHandlers(protocols,hanp2);
    // p3.addHandlers(protocols,new ProtocolHandler());
    // p4.addHandlers(protocols,new ProtocolHandler());
    // p5.addHandlers(protocols,new ProtocolHandler());
    await utils.sleep(1000);
    // stop the nodes
    // setTimeout(async ()=>{
    //     await p1.syncStop();
    //     await p2.syncStop();
    //     await p3.syncStop();
    //     await p4.syncStop();
    //     await p5.syncStop();
    //     await boostrap.syncStop();
    //
    // },1000 * 3);
}

run();