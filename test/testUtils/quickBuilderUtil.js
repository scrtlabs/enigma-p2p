const nodeUtils = require("../../src/common/utils");
const EnviornmentBuilder = require("../../src/main_controller/EnvironmentBuilder");
const CoreServer = require("../../src/core/core_server_mock/core_server");
const path = require("path");
const _B1Path = path.join(__dirname, "./id-l");
const _B1Port = "10300";
const _B2Path = path.join(__dirname, "./id-d");
const _B2Port = "10301";
const _B1Addr =
  "/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm";
const _B2Addr =
  "/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP";
const tempdir = require("tempdir");
/**
 * public
 * */

// all config per node
const getDefault = () => {
  return {
    withLogger: true, // with logger output to std
    isBootstrap: false, // if is event bootsrap node or not
    isB1Bootstrap: true, // default B1 else B2 if false
    bootstrapNodes: [], // default B1
    bootstrapPort: 0, // default B1
    idPath: _B1Path,
    withCore: true,
    corePort: null, // optional else random
    withEth: false,
    ethExistingAddr: null, // optional, if null create else connect to existing
    ethWorkerAddress: null, // optional
    ethWS: null, // optional, websocket provider
    withProxy: false,
    proxyPort: null, // optional, either set port or random
    withTasksDb: true, // with tasks database
    taskDbPath: null, // optional if set, then use specific  task dbpath location for tasks (withtasksDb should be set true)
    principalUri: null,
    stateful: false // optional, true if a local DB is needed for testing- stores data in a hashMap on memory
  };
};

/**
 * create n number of nodes all connected to bStrap
 * */

// TODO: look at basic_eth_test to adjust this code for the production writer (private key)
module.exports.createN = async (n, optionsOverride) => {
  let optionsOverrideBStrap = {};
  let optionsOverridePeer = {};
  let finalBstrapOpts = {};
  if (optionsOverride) {
    if (optionsOverride.bOpts) {
      optionsOverrideBStrap = optionsOverride.bOpts;
    }
    if (optionsOverride.pOpts) {
      optionsOverridePeer = optionsOverride.pOpts;
    }
  }
  if (optionsOverrideBStrap) {
    finalBstrapOpts = optionsOverrideBStrap;
  }
  finalBstrapOpts.isBootstrap = true;
  finalBstrapOpts = nodeUtils.applyDelta(getDefault(), optionsOverrideBStrap);
  optionsOverridePeer = nodeUtils.applyDelta(getDefault(), optionsOverridePeer);

  const bNode = await _createNode(finalBstrapOpts);
  const peers = [];
  for (let i = 0; i < n; ++i) {
    const p = await _createNode(optionsOverridePeer);
    peers.push(p);
  }
  return { peers: peers, bNode: bNode };
};
/**
 * craete connected 2 nodes
 * */

module.exports.createTwo = async optionsOverride => {
  let optionsOverrideBStrap = {};
  let optionsOverridePeer = {};
  let finalBstrapOpts = {};
  if (optionsOverride) {
    if (optionsOverride.bOpts) {
      optionsOverrideBStrap = optionsOverride.bOpts;
    }
    if (optionsOverride.pOpts) {
      optionsOverridePeer = optionsOverride.pOpts;
    }
  }
  if (optionsOverrideBStrap) {
    finalBstrapOpts = optionsOverrideBStrap;
  }
  finalBstrapOpts.isBootstrap = true;
  const result = await _createTwo(finalBstrapOpts, optionsOverridePeer);
  return result;
};

const _createTwo = async (optionsOverrideBStrap, optionsOverridePeer) => {
  const peerOpts = nodeUtils.applyDelta(getDefault(), optionsOverridePeer);
  const bNodeOpts = nodeUtils.applyDelta(getDefault(), optionsOverrideBStrap);
  // create bootstrap node here
  const bNode = await _createNode(bNodeOpts);
  // craete peeravishai@enigma.co
  const peer = await _createNode(peerOpts);
  return { bNode: bNode, peer: peer };
};

module.exports.createNode = async function(options) {
  let final = {};
  if (options) {
    final = options;
  }
  final = nodeUtils.applyDelta(getDefault(), final);
  return await _createNode(final);
};

// TODO: look at basic_eth_test to adjust this code for the production writer (private key)
const _createNode = async options => {
  const nodeConfigObject = {
    bootstrapNodes: _B1Addr,
    port: null,
    nickname: null,
    idPath: null,
    extraConfig: {}
  };
  if (options.isBootstrap) {
    const bNodes = [];
    let port = null;
    let idPath = null;
    if (options.isB1Bootstrap) {
      bNodes.push(_B1Addr);
      port = _B1Port;
      idPath = _B1Path;
    } else {
      // B2
      bNodes.push(_B2Addr);
      port = _B2Port;
      idPath = _B2Path;
    }
    nodeConfigObject.port = port;
    nodeConfigObject.idPath = idPath;
    nodeConfigObject.bootstrapNodes = bNodes;
  }
  nodeConfigObject.bootstrapNodes = [_B1Addr];
  // check if bootstrapNodes is passed
  if (!options.bootstrapNodes) {
    nodeConfigObject.bootstrapNodes = options.bootstrapNodes;
  }
  let mainController;
  const builder = new EnviornmentBuilder();
  let coreServer = null;
  if (options.withCore) {
    let port;
    if (options.corePort > 2000) {
      port = options.corePort;
    } else {
      port = rand(2000, 10000);
    }
    const uri = "tcp://127.0.0.1:" + port;
    coreServer = new CoreServer();
    coreServer.runServer(uri, options.stateful);
    builder.setIpcConfig({ uri: uri });
  }
  if (options.withProxy) {
    let port;
    if (options.proxyPort > 2000) {
      port = options.proxyPort;
    } else {
      port = rand(2000, 10000);
    }
    builder.setJsonRpcConfig({
      port: port,
      peerId: null
    });
  }
  if (options.withEth) {
    builder.setEthereumConfig({
      minConfirmations: 0,
      ethereumWebsocketProvider: options.ethWS,
      enigmaContractAddress: options.ethExistingAddr,
      ethereumAddress: options.ethWorkerAddress
    });
  }
  let dbPath = null;
  if (options.withTasksDb) {
    if (options.taskDbPath) {
      dbPath = options.taskDbPath;
    } else {
      dbPath = tempdir.sync();
    }
    nodeConfigObject.extraConfig.tm = {
      dbPath: dbPath
    };
  }
  if (!options.withLogger) {
    builder.setLoggerConfig({
      cli: false,
      file: false
    });
  }
  nodeConfigObject.extraConfig.principal = { uri: options.principalUri };
  mainController = await builder.setNodeConfig(nodeConfigObject).build();
  return {
    mainController: mainController,
    coreServer: coreServer,
    tasksDbPath: dbPath
  };
};

const rand = (min, max) => {
  return Math.ceil(Math.random() * (max - min) + min);
};
