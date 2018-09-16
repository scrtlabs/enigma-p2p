const parallel = require('async/parallel');
const EnigmaNode = require('../../../../src/worker/EnigmaNode');
const utils = require('../../utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const WorkerUtils = require('../../../../src/common/utils');
const Pushable = require('pull-pushable')
const p = Pushable()

function startNode(type,callback){
        let nodeDns, nodePeer, nodeRequester;
        let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
        let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
        let protocols = ['/chat'];
    switch(type){
        case 'dns' :
            nodeDns = utils.buildWorker(portDialer,portDns,idDns);
            nodeDns.loadNode(pathDns,()=>{
                nodeDns.start(()=>{
                    nodeDns.addHandlers(protocols,NaiveHandle);
                    setTimeout(()=>{
                        callback(nodeDns);
                    },100);
                });
            });
            break;
        case 'worker' :
            nodePeer = utils.buildWorker(portDialer,portDns,idDns);
            nodePeer.createNode(err=>{
                assert.equal(null,err,"error creating peer node.");
                nodePeer.start(()=>{
                    nodePeer.addHandlers(protocols,NaiveHandle);
                    setTimeout(()=>{
                        callback(nodePeer);
                    },100);
                });
            });
            break;
    }
}

// let type = process.argv[2];
// startNode(type, node=>{
//     if(type == 'worker'){
//         ''
//     }
// });

console.log(type);
function NaiveHandle(type,peer,params) {
    let conn = params.connection;
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
        case '/chat':
                console.log('nodeA dialed to nodeB on protocol: /chat/1.0.0')
                console.log('Type a message and see what happens')
                // Write operation. Data sent as a buffer
                pull(
                    p,
                    conn
                )
                // Sink, data converted from buffer to utf8 string
                pull(
                    conn,
                    pull.map((data) => {
                        return data.toString('utf8').replace('\n', '')
                    }),
                    pull.drain(console.log)
                )

                process.stdin.setEncoding('utf8')
                process.openStdin().on('data', (chunk) => {
                    var data = chunk.toString()
                    p.push(data)
                })
            break;
    }
}