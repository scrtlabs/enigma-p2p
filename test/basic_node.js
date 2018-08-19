const parallel = require('async/parallel');
const EnigmaNode = require('../src/worker/EnigmaNode');
const utils = require('./utils');
const assert = require('assert');
const waterfall = require('async/waterfall');
const pull = require('pull-stream');


it('hello world', function(done) {
    assert(true,true)
    setImmediate(done);
});

it('Should echo+discovery 2 nodes',function(done){
    let portListener = '0';
    let portDialer = '10333';
    let idListener = 'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
    let protocols = ['/echo'];
    let nodeDialer,nodeListener;
    let pathDialer = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-d';
    let pathListener = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-l';
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
        assert.equal(err,null);
        nodeDialer.start(()=>{
            nodeDialer.addHandlers(protocols,NaiveHandle);
            nodeDialer.dialProtocol(nodeListener.node.peerInfo,'/echo',(err,conn)=>{
                assert.equal(null,err);
                // send the echo to the listener
                pull(
                    pull.values(['hey']),
                    conn,
                    pull.collect((err,data)=>{
                        assert.equal(null,err);
                        assert.equal('hey',data.toString());
                        //stop
                        nodeDialer.stop((err)=>{
                            assert.equal(null,err);
                            nodeListener.stop((err)=>{
                                assert.equal(null,err);
                                setImmediate(done);
                            });
                        });
                    })
                );
            });
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