const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const NodeBundle = require('../src/worker/libp2p-bundle');
const EngNode = require('../src/worker/EnigmaNode');
const nodeUtils = require('../src/common/utils');
const Pushable = require('pull-pushable')
const consts = require('../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const ProtocolHandler = require('../src/worker/handlers/ProtcolHandler');
const Controller = require('../src/worker/NodeController');

module.exports.getDefaultOptions = function(){
    return _getDefaultOptions();
}
function _getDefaultOptions(){
    let __defaultOptios = {
        'port' : '0',
        'pathPeerId' :'/home/wildermind/WebstormProjects/enigma-p2p/test/id-l',
        'dnsInfo' :[
            {'port' : '10333','id' :'QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'}
        ]
    };
    return __defaultOptios;
}

// options: nickname, isDiscover, dnsInfo , isDns, port
module.exports.quickWorker = function(options){
    return _quickWorker(options);
};
function _quickWorker(options){
    options.isDiscover = true;
    options.multiAddrs = ['/ip4/0.0.0.0/tcp/'+options.port];
    options.dnsNodes = [];
    options.dnsInfo.forEach(i=>{
        options.dnsNodes.push('/ip4/0.0.0.0/tcp/'+i.port+'/ipfs/'+i.id);
    });

    if (options.port =='0')
        options.pathPeerId = null;

    let worker = new EngNode(options,new ProtocolHandler());
    return worker;
};

module.exports.createEnviornment = function(optionsList){
    let nodes = [];
    optionsList.forEach(options=>{
        nodes.push(_quickWorker(options));
    });
    return nodes;
};

module.exports.createEnvOptions = function(){
    let b2Info = {'id' : 'Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP', 'port' : '10334'};
    // bootnode 1
    let b1Opts = _getDefaultOptions();
    b1Opts.nickname = "B1";
    b1Opts.port = '10333';
    b1Opts.dnsInfo.push(b2Info);
    // bootnode 2
    let b2Opts = _getDefaultOptions();
    b2Opts.nickname = "B2";
    b2Opts.port = '10334';
    b2Opts.pathPeerId = '/home/wildermind/WebstormProjects/enigma-p2p/test/id-d';
    // peer 1
    let p1Opts = _getDefaultOptions();
    p1Opts.nickname = "p1";
    // peer 2
    let p2Opts = _getDefaultOptions();
    p2Opts.nickname = "p2";
    // peer 3
    let p3Opts = _getDefaultOptions();
    p3Opts.nickname = "p3";
    p3Opts.dnsInfo = [b2Info];
    // peer 4
    let p4Opts = _getDefaultOptions();
    p4Opts.nickname = "p4";
    p4Opts.dnsInfo = [b2Info];
    // peer 5
    let newWorkerOpts = _getDefaultOptions();
    newWorkerOpts.nickname = "newWorker";
    newWorkerOpts.dnsInfo.push(b2Info);

    return [b1Opts,b2Opts,p1Opts,p2Opts,p3Opts,p4Opts, newWorkerOpts];
};

module.exports.runNodesInOrder = function(nodes){

    return new Promise((res,rej)=>{
        let jobs = [];
        nodes.forEach(n=>{
            jobs.push(cb=>{
                n.syncRun()
                    .then(()=>{
                        setTimeout(()=>{
                            cb();
                        },2000 * 2);
                    });
            });
        });

        waterfall(jobs,(err)=>{
            res();
        });
    });
};