/**
 * This is the interface components for interacting with Core.
 * It should be passed to the MainController another Runtime and implement setChannel() && type()
 * This class supports sequential zeromq messages and Channels implementation of sequence.
 * Each message to Core is identified with a unique ID.
 * */
const IpcClient = require('./ipc');
const constants = require('../common/constants');

//actions
const GetRegistrationParamsAction = require('./actions/GetRegistrationParamsAction');
const GetAllTipsAction = require('./actions/DbRead/GetAllTipsAction');
const GetAllAddrsAction = require('./actions/DbRead/GetAllAddrsAction');
const GetDeltasAction = require('./actions/DbRead/GetDeltasAction');
const DbAction = require('./actions/DbAction');
const GetContractCodeAction = require('./actions/DbRead/GetContractCodeAction');
const UpdateDbAction = require('./actions/DbWrite/UpdateDbAction');
const NewTaskEncryptionKeyAction = require('./actions/NewTaskEncryptionKeyAction');

class CoreRuntime{
  constructor(config, logger){
    if(config.uri)
      this._ipcClient = new IpcClient(config.uri, logger);
    else
      throw new Error("Must pass uri to CoreRuntime");

    this._initIpcClient();
    this._communicator = null;
    this._logger = logger;
    let sendToCoreAction = new DbAction(this);
    let preParseAction = new GetRegistrationParamsAction(this);
    let getDbAction = new GetAllTipsAction(this);
    this._actions = {
      [constants.CORE_REQUESTS.CORE_DB_ACTION] : sendToCoreAction,
      [constants.CORE_REQUESTS.DeploySecretContract] : preParseAction,
      [constants.CORE_REQUESTS.GetRegistrationParams] : preParseAction,
      [constants.CORE_REQUESTS.IdentityChallenge] : null,
      [constants.CORE_REQUESTS.GetTip] : null,
      [constants.CORE_REQUESTS.GetAllTips] : getDbAction,
      [constants.CORE_REQUESTS.GetAllAddrs] : new GetAllAddrsAction(this),
      [constants.CORE_REQUESTS.GetDelta] : null,
      [constants.CORE_REQUESTS.GetDeltas] : new GetDeltasAction(this),
      [constants.CORE_REQUESTS.GetContract] : new GetContractCodeAction(this),
      [constants.CORE_REQUESTS.UpdateDb] : new UpdateDbAction(this),
      [constants.CORE_REQUESTS.NewTaskEncryptionKey] : new NewTaskEncryptionKeyAction(this),
    };
  }
  /**
   * Connects to core
   * */
  _initIpcClient(){
    this._ipcClient.connect();
    this._ipcClient.setResponseHandler((msg)=>{
      //TODO:: this is being called everytime a message comes from core.
      //TODO:: BUT, messages from core are responses so this is irrelevant
      //TODO:: each Action handles the message inside the class with a ref to socket
      //TODO:: so think if this even nessceary, maybe logging?
    });
  }
  disconnect(){
    this.getIpcClient().disconnect();
  }
  getIpcClient(){
    return this._ipcClient;
  }
  /**
   * Returns the Channel commiunicator, used by Actions
   * @return {Communicator} this._communicator
   * */
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
      let concreteCmd = envelop.content().type;
      let action = this._actions[concreteCmd];
      if(action){
        action.execute(envelop);
      }
    });
  }
  execCmd(cmd,params){
    let action = this._actions[cmd];
    if(action) {
      action.execute(params);
    }
  }
}

module.exports = CoreRuntime;

// mini tests


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
