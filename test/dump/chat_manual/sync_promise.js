const parallel = require('async/parallel');
const EnigmaNode = require('../../../src/worker/EnigmaNode');
const utils = require('../../utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const WorkerUtils = require('../../../src/common/utils');
const Pushable = require('pull-pushable')
const p = Pushable()


async function runNode(isDns){
    // initialize enigma node
    let worker = utils.quickWorker(isDns);
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let protocols = ['/echo'];
    await worker.syncInit(pathDns);
    await worker.syncStart();
    worker.addHandlers(protocols,NaiveHandle);
}

runNode(true);

function NaiveHandle(type,peer,params) {
    switch (type) {
        case "peer:discovery":
            utils.NaiveHandlers['peer:discovery'](peer, params.peer);
            break;
        case "peer:connect":
            utils.NaiveHandlers['peer:connect'](peer, params.peer);
            break;
        case "/echo":
            utils.NaiveHandlers['/echo'](params.protocol,params.connection);
            break;
        case "/getpeerbook":
            utils.NaiveHandlers['/getpeerbook'](peer,params);
            break;
        case '/groupdial':
            utils.NaiveHandlers['/groupdial'](peer,params);
            break;
        case '/mailbox':
            utils.NaiveHandlers['/mailbox'](peer,params);
    }
}