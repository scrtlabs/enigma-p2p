const IpcClient = require('./ipc');
const constants = require('../common/constants');

//actions
const GetRegistrationParamsAction = require('./actions/GetRegistrationParamsAction');
class CoreRuntime{
  constructor(config){

    if(config.uri)
      this._ipcClient = new IpcClient(config.uri);
    else
      throw new Error("Must pass uri to CoreRuntime");

    this._initIpcClient();
    this._communicator = null;

    this._actions = {
      [constants.CORE_REQUESTS.GetRegistrationParams] : new GetRegistrationParamsAction(this),
      [constants.CORE_REQUESTS.IdentityChallenge] : null,
      [constants.CORE_REQUESTS.GetTip] : null,
      [constants.CORE_REQUESTS.GetAllTips] : null,
      [constants.CORE_REQUESTS.GetAllAddrs] : null,
      [constants.CORE_REQUESTS.GetDelta] : null,
      [constants.CORE_REQUESTS.GetContract] : null,
    };

  }
  _initIpcClient(){
    this._ipcClient.connect();
    this._ipcClient.setResponseHandler((msg)=>{
      //TODO:: this is being called everytime a message comes from core.
      //TODO:: BUT, messages from core are responses so this is irrelevant
      //TODO:: each Action handles the message inside the class with a ref to socket
      //TODO:: so think if this even nessceary, maybe logging?
    });
  }
  type(){
    return constants.RUNTIME_TYPE.Core;
  }
  disconnect(){
    this.getIpcClient().disconnect();
  }
  getIpcClient(){
    return this._ipcClient;
  }
  getCommunicator(){
    return this._communicator;
  }
  /** MUST for runtime manager (main controller)*/
  type(){
    return constants.RUNTIME_TYPE.Core;
  }
  /** MUST for runtime manager (main controller)*/
  setChannel(communicator){
    this._communicator = communicator;
    this._communicator.setOnMessage((envelop)=>{
      let action = this._actions[envelop.type()];
      if(action){
        action.execute(envelop);
      }
    });
  }
}

module.exports = CoreRuntime;
// async function test1(){
//   //start the server
//   const utils = require('../common/utils');
//   const uri = 'tcp://127.0.0.1:5555';
//   const CoreServer = require('./core_server_mock/core_server');
//   CoreServer.runServer(uri);
//   await utils.sleep(1000);
// // start the client
//   const Channel = require('../main_controller/channels/Channel');
//   const Envelop = require('../main_controller/channels/Envelop');
//   let channels = Channel.biDirectChannel();
//   let c1 = channels.channel1;
//   let c2 = channels.channel2;
//   let coreRuntime = new CoreRuntime({uri : uri});
//   coreRuntime.setChannel(c2);
//   await utils.sleep(1000);
//   c1.setOnMessage((msgEnv)=>{
//     console.log("Umm, got general incoming message");
//   });
//   let reqEnv = new Envelop(true,{type : constants.CORE_REQUESTS.GetRegistrationParams}, constants.CORE_REQUESTS.GetRegistrationParams );
//   c1.sendAndReceive(reqEnv)
//   .then(resEnv=>{
//     console.log("got the registration params " + JSON.stringify(resEnv.content()));
//   });
//
// }
//
// test1();
