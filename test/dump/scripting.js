const parallel = require('async/parallel');
const EnigmaNode = require('../../src/worker/EnigmaNode');
const utils = require('../utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');

/**
 * Test Description:
 * The test spawns 2 nodes Dialer and Listener.
 * The test uses the Discovery algorithm of libp2p to help the Dialer find the Listener
 * The Dialer sends a message the Listener then responds.*/

    let portListener = '0';
    let portDialer = '10333';
    let idListener = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let protocols = ['/echo'];
    let pathDialer = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-d';
    let pathListener = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let nodeDialer,nodeListener;
    waterfall([
        cb =>{ // the listener node
            nodeListener = utils.buildWorker(portListener,portListener,idListener);
            nodeListener.loadNode(pathListener,()=>{
                nodeListener.start(()=>{
                    nodeListener.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        },
        cb =>{
            nodeDialer = utils.buildWorker(portDialer,portListener,idListener);
            nodeDialer.loadNode(pathDialer,()=>{
                setTimeout(cb,100);
            });
        },
    ],(err)=>{
        assert.equal(null,err, "Some error at the end of the waterfall");
        nodeDialer.start(()=>{
            nodeDialer.addHandlers(protocols,NaiveHandle);
            nodeDialer.dialProtocol(nodeListener.node.peerInfo,'/echo',(err,conn)=>{
                assert.equal(null,err, "Some error at Dialer.dialProtocol");
                // send the echo to the listener
                pull(
                    pull.values(['hey']),
                    conn,
                    pull.collect((err,data)=>{
                        assert.equal(null,err, "Some error collection the echo response from the Listener");
                        assert.equal('hey',data.toString());
                        //stop
                        nodeDialer.stop((err)=>{
                            assert.equal(null,err, "Some error while Dialer stopped");
                            nodeListener.stop((err)=>{
                                assert.equal(null,err,"Some error while listener stopped.");

                            });
                        });
                    })
                );
            });
        });
    });









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
    }
}



// WORKER FACTORY
//
// class WorkerFactory{
//     constructor(){
//         this.creators = {};
//         this.creators['bootstrapCreator'] = this._createBootstrapNode;
//         this.creators['workerCreator'] = this._createWorkerNode;
//     }
//     /**Create new node
//      * @param {Json} options {
//      *  'db' : {
//      *      ???
//      *  }
//      *  'is_worker' : true,
//      *  'is_bootstrap' : false,
//      *  'bootstrap_nodes_list' : [],
//      *  'port' : '0',
//      *  'multiaddresses' : []
//      *  'create_id' : '',
//      *  'id_path' : '/some/path',
//      *  'port' : '0',
//      *  'handler' : ProtocolHandler,
//      *  'connection_manager' : ConnectionManager,
//      *  'polocy' : Policy
//      *  'protocols' : [],
//      *  'libp2p' : {
//      *      'discovery' : 'true',
//      *      'interval' : 2000,
//      *      'k_bucket_size' : 20,
//      *    }
//      * }
//      * */
//     create(options){
//         if(options['is_boostrap']){
//             this.creators['bootstrapCreator'](options);
//         }else if(options['is_boostrap']){
//             this.creators['workerCreator'](options);
//         }else{
//             throw {"name" : "NoTypeDefined", "message" : "either boostrap or worker"};
//         }
//     }
//     _createBootstrapNode(options){
//
//     }
//     _createWorkerNode(options){
//
//     }
// }
//
//
// // create new worker
// // let log = new Logger();?
// // let coreIpc = new CoreIpc();?
// // let cli = new CLI();?
// // let db = new DB();?
// // let worker = await new WorkerFactory().create(options).start(); // pass a FACADE
// // let controller = new Controller(worker, db,coreIpc,log ,cli, generalSettings);
// // controller.start();
//
// class Controller {
//     constructor(worker,db,log,  coreIpc, log, cli,generalSettings){
//         this.settings = generalSettings;
//         this.db = db;
//         this.log = log;
//         this.worker = worker;
//         this.coreIpc = coreIpc;
//         this.cli = cli;
//     }
//     start(){
//         this.worker.start();
//         this.coreIpc.start(this);
//     }
//     onIpcMessage(message){
//         // either response or request
//     }
//     // db access from p2p (for example contractSync request)
//     onDbRequest(request){
//
//     }
//     // on CLI Message (for example, add peer )
//     onCliMessage(message){
//
//     }
//     stop(){
//
//     }
// }
//
// // sync message
//
// // web3
// // getStates()
// // getWorkers()
// // getTasks()
// // getRandom()
// // enigmaContract()
// // what is in core and what is in p2p?
// // web3 ?
// // db ?
// // cli ?
//






































