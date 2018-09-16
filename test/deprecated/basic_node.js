const parallel = require('async/parallel');
const EnigmaNode = require('../../src/worker/EnigmaNode');
const utils = require('./utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');
const SEC = 1000;
const TEST_TREE = require('./test_tree').TEST_TREE;
/**
 * Test Description:
 * The test spawns 2 nodes Dialer and Listener.
 * The test uses the Discovery algorithm of libp2p to help the Dialer find the Listener
 * The Dialer sends a message the Listener then responds.*/

it('Should echo+discovery 2 nodes',function(done){
    if(!TEST_TREE['basic_node']['all']){
        this.skip();
    }
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
                                setImmediate(done);
                            });
                        });
                    })
                );
            });
        });
    });
});

/**
 * Test Description
 * This test should load 1 Listener(DNS like), 1 subscriber, 1 publisher
 * perform a broadcast (pub/sub)
 * Both the DNS(listener) and the subscriber */
it('Should discovery+pub+sub event',function(done){
    if(!TEST_TREE['basic_node']['all']){
        this.skip();
    }
    let validatedMsgs = 0, duringShutdown = false;
    let nodeDns, nodeSubscriber, nodePublisher;
    let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    // topic handlers is the callback that will be triggerd uppon recieving an event
    // final_handler is the callback that will be triggerd ONCE subscribed.
    let subscriptions = [{'topic':'broadcast',
        'topic_handler':(msg)=>{
            validatedMsgs++;
        },'final_handler':()=>{
            console.log('subscribed');
    }}];
    let protocols = [];
    waterfall([
        // dns
        cb =>{
            nodeDns = utils.buildWorker(portDialer,portDns,idDns);
            nodeDns.loadNode(pathDns,()=>{
                nodeDns.start(()=>{
                    nodeDns.addHandlers(protocols,NaiveHandle);
                    // subscribing to "broadcast" topic and passing handlers
                    nodeDns.subscribe(subscriptions);
                    setTimeout(cb,100);
                });
            });
        },
        // subscriber
        cb =>{
            nodeSubscriber = utils.buildWorker(portDialer,portDns,idDns);
            nodeSubscriber.createNode(err=>{
                assert.equal(null,err,"error creating subscriber node.");
                nodeSubscriber.start(()=>{
                    nodeSubscriber.addHandlers(protocols,NaiveHandle);
                    // subscribing to "broadcast" topic and passing handlers
                    nodeDns.subscribe(subscriptions);
                    setTimeout(cb,100);
                });
            });
        },
        // publisher
        cb =>{
            nodePublisher = utils.buildWorker(portDialer,portDns,idDns);
            nodePublisher.createNode(err=>{
                assert.equal(null,err,"error creating publisher node.");
                nodePublisher.start(()=>{
                    nodePublisher.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        }
    ],err =>{
        assert.equal(null,err, "error in the waterfall() pipe");
        // at this point the DNS and the subscriber should be subscribed to "broadcast" topic
        // all 3 are connected via the DNS (Bootstrap mechanism)
        // Now, publish event on "broadcast" topic and validate and got received.
        let intervalID = nodePublisher.broadcastLoop('broadcast',100,Buffer.from(JSON.stringify({'value':'hello'})),()=>{
            // once published, verify DNS and subscriber got the message if validateMsgs >=2
            // shutdown
            if(validatedMsgs >= 2 && !duringShutdown){
                duringShutdown = true;
                shutdown_test2(nodeDns,nodeSubscriber,nodePublisher,intervalID,done);
            }
        });
    });
});

/**
 * Test Description - /getpeerbook
 * This test connects 2 peers to a boostrap node and test /getpeerbook
 * naming convention: DNS, peer, requester
 */

it('Should /getpeerbook from other peer',function(done){
    if(!TEST_TREE['basic_node']['all']){
        this.skip();
    }
    let nodeDns, nodePeer, nodeRequester;
    let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let protocols = ['/getpeerbook'];

    waterfall([
        // DNS
        cb =>{
            nodeDns = utils.buildWorker(portDialer,portDns,idDns);
            nodeDns.loadNode(pathDns, ()=>{
                nodeDns.start(()=>{
                    nodeDns.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        },
        // Peer
        cb =>{
            nodePeer = utils.buildWorker(portDialer,portDns,idDns);
            nodePeer.createNode(err=>{
                assert.equal(null,err,"error creating peer node.");
                nodePeer.start(()=>{
                    nodePeer.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        },
        // Requester
        cb =>{
            nodeRequester = utils.buildWorker(portDialer,portDns,idDns);
            nodeRequester.createNode(err=>{
                assert.equal(null,err,"error creating requester node.");
                nodeRequester.start(()=>{
                    nodeRequester.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        }
    ],err=>{
        assert.equal(null,err, "error in the waterfall() pipe");
        // request the peer from from the DNS and the result should be 1 result.
        nodeRequester.getPeersPeerBook(nodeDns.node.peerInfo,(err,peerBook)=>{
            setTimeout(()=>{
                assert.equal(2,peerBook.peers.length);
                shutdown_test2(nodeDns, nodeRequester, nodePeer,null,done);
            },100);
        });
    });
});

/**Group dial to all connected peers
 * */

it('Should do a group dial to all peers',function(done){
    if(!TEST_TREE['basic_node']['all']){
        this.skip();
    }
    let nodeDns, nodePeer, nodeRequester;
    let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    let protocols = ['/groupdial'];

    waterfall([
        // DNS
        cb =>{
            nodeDns = utils.buildWorker(portDialer,portDns,idDns);
            nodeDns.loadNode(pathDns, ()=>{
                nodeDns.start(()=>{
                    nodeDns.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        },
        // Peer
        cb =>{
            nodePeer = utils.buildWorker(portDialer,portDns,idDns);
            nodePeer.createNode(err=>{
                assert.equal(null,err,"error creating peer node.");
                nodePeer.start(()=>{
                    nodePeer.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        },
        // Requester
        cb =>{
            nodeRequester = utils.buildWorker(portDialer,portDns,idDns);
            nodeRequester.createNode(err=>{
                assert.equal(null,err,"error creating requester node.");
                nodeRequester.start(()=>{
                    nodeRequester.addHandlers(protocols,NaiveHandle);
                    setTimeout(cb,100);
                });
            });
        }
    ],err=>{
        let isDone = false;
        let resNum = 0;
        assert.equal(null,err, "error in the waterfall() pipe");
        // request the peer from from the DNS and the result should be 1 result.
        waterfall([
            cb =>{
                setTimeout(()=>{
                    nodeRequester.groupDial('/groupdial',(protoco,connection)=>{
                        console.log("dialing.");
                        // write message to peer
                        pull(
                            pull.values(['Hi I am the dialing!']),
                            connection,
                        );
                        // read response
                        pull(
                            connection,
                            pull.map((data)=>{
                                reponse = 'RESPONSE : '+data.toString('utf8').replace('\n', '');
                                resNum++;
                                return reponse;
                            }),
                            pull.drain(console.log)
                        );

                        setTimeout(()=>{
                            // validate that 2 msgs were send AND finish.
                            if(!isDone && resNum == 2){
                                isDone = true;
                                cb();
                            }
                        },SEC*3);
                    });
                },SEC);
            },
        ],err=>{
                assert.equal(null,err,'some error in the waterfall()');
                assert.equal(2,resNum, 'wrong responses number');
                setTimeout(()=>{
                    shutdown_test2(nodeDns, nodeRequester, nodePeer,null,done);
                },SEC*2);
        });

    });
});

// it('Should test /mailbox/v1 protocol',function(done){
//     module.exports.startNode = function(type,protocols,handlers,callback){}
// });
/** test consistent discovery
 * */
// it('Should perform consistent discovery',function(done){
//     let nodeDns, nodePeer, nodeRequester;
//     let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
//     let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
//     let protocols = ['/getpeerbook'];
//
//     waterfall([
//         // DNS
//         cb =>{
//             nodeDns = utils.buildWorker(portDialer,portDns,idDns);
//             nodeDns.loadNode(pathDns, ()=>{
//                 nodeDns.start(()=>{
//                     nodeDns.addHandlers(protocols,NaiveHandle);
//                     setTimeout(cb,100);
//                 });
//             });
//         },
//         // Peer
//         cb =>{
//             nodePeer = utils.buildWorker(portDialer,portDns,idDns);
//             nodePeer.createNode(err=>{
//                 assert.equal(null,err,"error creating peer node.");
//                 nodePeer.start(()=>{
//                     nodePeer.addHandlers(protocols,NaiveHandle);
//                     setTimeout(cb,100);
//                 });
//             });
//         },
//         // Requester
//         cb =>{
//             nodeRequester = utils.buildWorker(portDialer,portDns,idDns);
//             nodeRequester.createNode(err=>{
//                 assert.equal(null,err,"error creating requester node.");
//                 nodeRequester.start(()=>{
//                     nodeRequester.addHandlers(protocols,NaiveHandle);
//                     setTimeout(cb,100);
//                 });
//             });
//         }
//     ],err=>{
//         assert.equal(null,err, "error in the waterfall() pipe");
//         // request the peer from from the DNS and the result should be 1 result.
//         let intervalId = nodeRequester.runConsistentDiscovery({'interval': 1000});
//         setTimeout(()=>{
//             clearInterval(intervalId);
//             setImmediate(done);
//         },1000*30);
//         // nodeRequester.getPeersPeerBook(nodeDns.node.peerInfo,(err,peerBook)=>{
//         //     setTimeout(()=>{
//         //         console.log(JSON.stringify(peerBook));
//         //         assert.equal(2,peerBook.peers.length);
//         //         shutdown_test2(nodeDns, nodeRequester, nodePeer,null,done);
//         //     },100);
//         // });
//     });
// });


/* helper functions */
class NaiveHandle {

    static handle(type, peer, params) {
        switch (type) {
            case "peer:discovery":
                utils.NaiveHandlers['peer:discovery'](peer, params.peer);
                break;
            case "peer:connect":
                utils.NaiveHandlers['peer:connect'](peer, params.peer);
                break;
            case "/echo":
                utils.NaiveHandlers['/echo'](params.protocol, params.connection);
                break;
            case "/getpeerbook":
                utils.NaiveHandlers['/getpeerbook'](peer, params);
                break;
            case '/groupdial':
                utils.NaiveHandlers['/groupdial'](peer, params);
                break;
        }
    }

}
/* test#2 specific functions */

// shutdown function for test #2
function shutdown_test2(nodeDns, nodeSubscriber, nodePublisher,intervalID,done){

    if(intervalID != null)
        clearInterval(intervalID);

    waterfall([
        cb=>{
            nodePublisher.stop((err)=>{
                assert.equal(null,err, "error stopping the publisher");
                cb();
            });
        },
        cb =>{
            nodeSubscriber.stop((err)=>{
                assert.equal(null,err, "error stopping the subscriber");
                cb();
            });
        },
        cb =>{
            nodeDns.stop((err)=>{
                assert.equal(null,err, "error stopping the DNS");
                setTimeout(cb,100);
            });
        }
    ],err=>{
        assert.equal(null,err,"error stopping the nodes in waterfall()");
        setImmediate(done);
    })
}