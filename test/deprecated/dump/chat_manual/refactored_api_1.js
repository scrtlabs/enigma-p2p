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
    setTimeout(async ()=>{
        await worker.syncStop();
        await dns.syncStop();
    },1000 * 3);
}

run()