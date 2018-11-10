const NodeController = require('../worker/controller/NodeController');
const MainController = require('../main_controller/FacadeController');
const CoreRuntime = require('../core/CoreRuntime');
/**
 * let builder = new EnvironmentBuilder();
 * let mainController = builder.setNodeConfig(nodeConfig).setIpcConfig(ipcConfig)...build();
 * */
class EnvironmentBuilder{
  constructor(){
    this._nodeConfig = false;
    this._ipcConfig = false;
  }
  /** this builder keeps state so in order to reuse it we need to clear it's data members.
   * use reuse() before building another controller.
   * i.e in tests when you want 10 nodes but want to reuse the same builder */
  reuse(){
    this._nodeConfig = false;
    this._ipcConfig = false;
    return this;
  }
  setNodeConfig(nodeConfig){
    this._nodeConfig = nodeConfig;
    return this;
  }
  setIpcConfig(ipcConfig){
    this._ipcConfig = ipcConfig;
    return this;
  }
  async build(){
    let runtimes = [];
    // init node
    if(this._nodeConfig){
      let node = NodeController.initDefaultTemplate(this._nodeConfig, this._nodeConfig.configPath);
      await node.start();
      runtimes.push(node);
    }
    // init ipc
    if(this._ipcConfig){
      let coreRuntime = new CoreRuntime(this._ipcConfig);
      runtimes.push(coreRuntime);
    }
    // init main controller
    let mainController = new MainController(runtimes);
    mainController.start();
    return mainController;
  }
}

module.exports = EnvironmentBuilder;

/** mini test */


// const path = require('path');
// const utils = require('../common/utils');
// let id = path.join(__dirname,'../../test/testUtils/id-l.json');
// let port = '10333';
// const bNodeConfig = {
//   'bootstrapNodes': [],
//   'port': port,
//   'nickname': 'bootstrap',
//   'idPath': id,
// };
// const peerConfig = {
//   'bootstrapNodes': ['/ip4/0.0.0.0/tcp/'+port+'/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'],
//   'port': '0',
//   'nickname': 'peer',
//   'idPath': null,
// };
//
// console.log(__dirname);
// async function test(){
//
//   let builder = new EnvironmentBuilder();
//   let mainBController = await builder.setNodeConfig(bNodeConfig).build();
//   await utils.sleep(2000);
//   let mainPController = await builder.reuse().setNodeConfig(peerConfig).build();
//   await utils.sleep(4000);
//   console.log(mainPController.getNode().getAllOutboundHandshakes().length);
//   console.log(mainBController.getNode().getAllInboundHandshakes().length);
// }
// test();
