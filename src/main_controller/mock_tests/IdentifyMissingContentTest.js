const EnvironmentBuilder = require('../EnvironmentBuilder');
const utils = require('../../common/utils');
const CoreServer = require('../../core/core_server_mock/core_server');

const peerConfig = {
  'bootstrapNodes': [],
  'port': '0',
  'nickname': 'peer',
  'idPath': null,
};

async function test(){
  const uri = 'tcp://127.0.0.1:5555';
  // start the server (core)
  let coreServer = new CoreServer();
  coreServer.runServer(uri);
  await utils.sleep(1500);
  // start the client (enigma-p2p)
  let builder = new EnvironmentBuilder();
  let mainController = await builder
    .setNodeConfig(peerConfig)
    .setIpcConfig({uri : uri})
    .build();
  await utils.sleep(5000);
  let fromCache = false;
  mainController.getNode().identifyMissingStates(fromCache,(missingStates)=>{
    console.log("got the missing states. success");
    console.log(JSON.stringify(missingStates));
  });
}
// test();
