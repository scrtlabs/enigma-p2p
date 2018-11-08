// /**
//  * This is a script that wrapps everything together
//  * should be used by index.js
//  * shouldn't be called directly.
//  * */
//
// const MainController = require('../main_controller/MainController');
// const NodeController = require('../worker/controller/NodeController');
// const Cli = require('../cli/Cli');
// const IpcClient = require('../core/ipc');
//
// // class EnvironmentBuilder{
// //
// //   constructor(settings){
// //     this._nodeConfig = settings.nodeConfig;
// //     this._ipcConfig = settings.ipcConfig;
// //     this._cliConfig = settings.cliConfig;
// //     this._node = null;
// //     this._ipcClient = null;
// //     this._cli = null;
// //     this._mainController = null;
// //   }
// //   async initEnvironment(){
// //     // init runtimes
// //     this._node = await this._initNodeController();
// //     this._ipcClient = this._initIpcClient();
// //     this._cli = this._initCli();
// //     // init main controller
// //     this._mainController = new MainController([this._node, this._ipcClient, this._cli])
// //     this._mainController.start();
// //     return this._mainController;
// //   }
// //   async buildNodeController(){
// //     let node = NodeController.initDefaultTemplate(this._nodeConfig,this._nodeConfig.configPath);
// //     await node.start();
// //     return node;
// //   }
// //   _initIpcClient(){
// //     let ipcClient = new IpcClient(this._ipcConfig.uri);
// //     ipcClient.connect();
// //     return ipcClient;
// //   }
// //   _initCli(){
// //     let cli = new Cli(this._cliConfig);
// //     return cli;
// //   }
// // }
//
// class EnvironmentBuilder{
//   cli(){
//
//   }
// }
// // EnvironmentBuilder.cli();
// //
// // RuntimeBuilder
// //   .setNodeConfig({})
// //   .setIpcClientConfig({})
// //   .build()
//
//
// // MainController()
//
//
//
//
// // Node - MainController
// // Controller(RuntimeList)
// // generators Builder.cli() Builder.json...()
// // BuilderList.append(Builder.cli().set(x).set(y).set(z).build())
// // BuilderList.append(Builder.core().set(x).set(y)...build())
// // Controller(RuntimeList)
//
//
//
//
//
//
//
//
//
//
//
// // RUNTIME A - CLI - Enviroment - Runtime
//
// // RUNTIME B - JsonRpcAPI - Runtime
//
// // RUNTIME C - Core - ...
//
// // RUNTIME D - P2P
//
// // RUNTIME E - Ethereum
