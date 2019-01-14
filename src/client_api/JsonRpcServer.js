/**
 * This class is responsible for interacting with users.
 * i.e if this node is also a proxy node then it can connect to dApp users.
 * and do stuff like: broadcast computeTask, get other workers PubKey etc.
 * */
const EventEmitter = require('events').EventEmitter;
const constants = require('../common/constants');
// const nodeUtils = require('../common/utils');
const jayson = require('jayson');
const PROXY_FLAG = constants.MAIN_CONTROLLER_NOTIFICATIONS.Proxy;
const Envelop = require('../main_controller/channels/Envelop');
// class QuoteAction {}

class JsonRpcServer extends EventEmitter {
  constructor(config) {
    super();
    this._communicator = null;
    this._port = config.port;
    this._peerId = config.peerId;
    this._pendingSequence = {};
    this._server = jayson.server({
      getInfo: (args, callback)=>{
        console.log('getInfo request...');
        callback(null, {peerId: this._peerId, status: 'ok'});
      },
      getWorkerEncryptionKey: (args, callback)=>{
        if (args.length !== 2) {
          // TODO:: do more stuff to validate input i.e check valid signing key
          // TODO:: to reduce network calls
          callback({'code': -32602, 'message': 'Invalid params'});
        } else {
          const workerSignKey = args[0];
          const userPubKey = args[1];
          const envelop = new Envelop(true,
              {
                workerSignKey: workerSignKey,
                userPubKey: userPubKey,
                type: constants.CORE_REQUESTS.NewTaskEncryptionKey,
              },
              PROXY_FLAG
          );

          this.getCommunicator()
          .sendAndReceive(envelop)
          .then(resEnv=>{
            console.log('GOT SOMETHING');
            let result = {};
            console.log(resEnv);
            result.workerEncryptionKey = resEnv.content().result.workerEncryptionKey;
            result.workerSig = resEnv.content().result.workerSig;
            callback(null, result);
          });
        }
      },
    });
  }
  listen() {
    console.log('JsonRpcServer listening on port ' + this._port);
    this._server.http().listen(this._port);
  }
  /** MUST for runtime manager (main controller)*/
  type() {
    return constants.RUNTIME_TYPE.JsonRpcApi;
  }
  /**
   * Returns the Channel commiunicator, used by Actions
   * @return {Communicator} this._communicator
   * */
  getCommunicator() {
    return this._communicator;
  }
  /** MUST for runtime manager (main controller)*/
  setChannel(communicator) {
    this._communicator = communicator;
    this._communicator.setOnMessage((envelop)=>{
      console.log('!!1!!!~!!#$%^&*(&^&%^$#$#$%^&*()');
      console.log('@@@@@@@@@@@@@@@@@@@@@ ggot envelop @@@@@');
      // let concreteCmd = envelop.content().type;
      // let action = this._actions[concreteCmd];
      // if(action){
      //   action.execute(envelop);
      // }
    });
  }
}
module.exports = JsonRpcServer;

// new JsonRpcServer({port : 3939 , peerId : '0xergiohtdjhrorudhgiurdhgiurdhgirdiudrgihl'}).listen();
