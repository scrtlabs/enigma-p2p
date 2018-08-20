const parallel = require('async/parallel');
const EnigmaNode = require('../src/worker/EnigmaNode');
const utils = require('./utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');

/**
 * Test Description:
 * The test spawns 2 nodes Dialer and Listener.
 * The test uses the Discovery algorithm of libp2p to help the Dialer find the Listener
 * The Dialer sends a message the Listener then responds.*/

it('Should echo+discovery 2 nodes',function(done){
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
    let validatedMsgs = 0, duringShutdown = false;
    let nodeDns, nodeSubscriber, nodePublisher;
    let portDialer = '0', portDns = '10333', idDns = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let pathDns = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
    // topic handler is the callback that will be triggerd uppon recieving an event
    // final_handler is the callback that will be triggerd ONCE subscribed.
    let subscriptions = [{'topic':'broadcast',
        'topic_handler':(msg)=>{
            console.log('from: ' + msg.from, 'data: ' + msg.data.toString());
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


/* helper functions */

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
    }
}
/* test#2 specific functions */

// shutdown function for test #2
function shutdown_test2(nodeDns, nodeSubscriber, nodePublisher,intervalID,done){
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