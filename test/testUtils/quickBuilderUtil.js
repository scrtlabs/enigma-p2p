const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const NodeBundle = require('../../src/worker/libp2p-bundle');
const EngNode = require('../../src/worker/EnigmaNode');
const nodeUtils = require('../../src/common/utils');
const Pushable = require('pull-pushable')
const consts = require('../../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const ProtocolHandler = require('../../src/worker/handlers/ProtocolHandler');
const Controller = require('../../src/worker/controller/NodeController');
const EnviornmentBuilder = require('../../src/main_controller/EnvironmentBuilder');
const CoreServer = require('../../src/core/core_server_mock/core_server');
const path = require('path');
const _B1Path = path.join(__dirname, './id-l');
const _B1Port = '10300';
const _B2Path = path.join(__dirname, './id-d');
const _B2Port = '10301';
const _B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
const _B2Addr = '/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';
/**
 * public
 * */

// all config per node
const getDefault = ()=>{
  return {
    isBootstrap : false, // if is event bootsrap node or not
    isB1Bootstrap : true, // default B1 else B2 if false
    bootstrapNodes : [], // default B1
    bootstrapPort : 0, // default B1
    idPath : _B1Path,
    withCore : true,
    corePort : null, // optional else random
    withEth : false,
    ethExistingAddr : null, // optional, if null create else connect to existing
    ethWS : null, // optional, websocket provider
    withProxy : false,
    proxyPort : null, // optional, either set port or random
    withTasksDb : true, // with tasks database
  };
};


/**
 * craete 2 nodes
 * */

module.exports.createTwo = async (optionsOverride)=>{
  let optionsOverrideBStrap = {};
  let optionsOverridePeer= {};
  let finalBstrapOpts = {};
  if(optionsOverride){
    optionsOverrideBStrap = optionsOverride.optionsOverrideBStrap;
    optionsOverridePeer= optionsOverride.optionsOverridePeer;
  }
  if(optionsOverrideBStrap){
    finalBstrapOpts = optionsOverrideBStrap;
  }
  finalBstrapOpts.isBootstrap = true;
  return _createTwo(finalBstrapOpts,optionsOverridePeer);
};


const _createTwo = async (optionsOverrideBStrap,optionsOverridePeer)=>{
  let peerOpts = nodeUtils.applyDelta(getDefault(),optionsOverridePeer);
  let bNodeOpts = nodeUtils.applyDelta(getDefault(),optionsOverrideBStrap);
  // create bootstrap node here
  let bNode = await createNode(bNodeOpts);
  // craete peer
  let peer = await createNode(peerOpts);
  return {bNode : bNode, peer : peer};
};

const createNode = async (options)=>{
   let nodeConfigObject = {
    'bootstrapNodes': _B1Addr,
    'port': null,
    'nickname': null,
    'idPath': null,
   };
   if(options.isBootstrap){
    let bNodes = [];
    let port = null;
    let idPath = null;
    if (options.isB1Bootstrap){
      bNodes.push(_B1Addr);
      port = _B1Port;
      idPath = _B1Path;
    }else{ // B2
      bNodes.push(_B2Addr);
      port = _B2Port;
      idPath = _B2Path;
    }
    nodeConfigObject.port = port;
    nodeConfigObject.idPath = idPath;
    nodeConfigObject.bootstrapNodes = bNodes;
   }
  let mainController;
  let builder = new EnviornmentBuilder();
  let coreServer = null;
  if(options.withCore){
    let port;
    if(options.corePort > 2000){
      port = options.corePort;
    }else{
      port = rand(2000,10000);
    }
    let uri = 'tcp://127.0.0.1:' + port;
    coreServer = new CoreServer();
    coreServer.runServer(uri);
  }
  if(options.withProxy){
    let port;
    if(options.proxyPort > 2000){
      port = options.proxyPort;
    }else{
      port = rand(2000,10000);
    }
    builder.setJsonRpcConfig({
      port : port, peerId : null,
    });
  }
  if(options.withEth){
    builder.setEthereumConfig({
      ethereumWebsocketProvider : options.ethWS,
      enigmaContractAddress : options.ethExistingAddr,
    });
  }
  if(options.withTasksDb){
    nodeConfigObject.extraConfig = {};
    nodeConfigObject.extraConfig.tm = {
      dbPath : path.join(__dirname, '/'+nodeUtils.randId()+".deletedb")
    };
  }
  mainController = await builder.setNodeConfig(nodeConfigObject).build();
  return {mainController : mainController, coreServer : coreServer};
};

const rand = (min, max)=>{
  return Math.ceil(Math.random() * (max - min) + min);
};

