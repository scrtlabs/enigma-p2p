/**
 * This class is responsible for interacting with users.
 * i.e if this node is also a proxy node then it can connect to dApp users.
 * and do stuff like: broadcast computeTask, get other workers PubKey etc.
 * */
const EventEmitter = require('events').EventEmitter;
const constants = require('../common/constants');
// const nodeUtils = require('../common/utils');
const jayson = require('jayson');
const cors = require('cors');
const connect = require('connect');
const bodyParser = require('body-parser');


const PROXY_FLAG = constants.MAIN_CONTROLLER_NOTIFICATIONS.Proxy;
const Envelop = require('../main_controller/channels/Envelop');

// class QuoteAction {}

class JsonRpcServer extends EventEmitter {
  constructor(config, logger) {
    super();
    this._communicator = null;
    this._logger = logger;
    this._port = config.port || constants.JSON_RPC_SERVER.port; ;
    this._peerId = config.peerId;

    this._pendingSequence = {};

    this._app = connect();
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
              .then((resEnv)=>{
                const result = {};
                console.log(resEnv);
                result.targetWorkerKey = resEnv.content().result.senderKey;
                result.workerEncryptionKey = resEnv.content().result.workerEncryptionKey;
                result.workerSig = resEnv.content().result.workerSig;
                callback(null, result);
              });
        }
      },
      // Placeholder.
      // TODO: Implement proper callback
      deploySecretContract: function(args, callback) {
        callback(null, [true]);
      },
      // Placeholder.
      // TODO: Implement proper callback
      sendTaskInput: function(args, callback) {
        if(typeof args === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.taskId === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.creationBlockNumber === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.sender === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.scAddr === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.encryptedFn === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.encryptedEncodedArgs === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.userTaskSig === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.userPubKey === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.fee === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else if (typeof args.msgId === "undefined") {
          callback({code: -32602, message: "Invalid params"});
        } else {
          // send to the network and return true
          callback(null, [true]);
        }

      },
      // Placeholder.
      // TODO: Implement proper callback
      getTaskStatus: function(args, callback) {
        callback(null, [2]);
      },
    },
    {
      collect: true // collect params in a single argument
    });
  }
  listen() {
    this._logger.debug('JsonRpcServer listening on port ' + this._port);
    this._app.use(cors({methods: ['POST']}));
    this._app.use(bodyParser.json());
    this._app.use(this._server.middleware());
    this._serverInstance = this._app.listen(this._port);
  }
  close(done) {
    this._serverInstance.close(done);
  }
  /** MUST for runtime manager (main controller)
   * @return {string} constants.RUNTIME_TYPE.JsonRpc
   * */
  type() {
    return constants.RUNTIME_TYPE.JsonRpc;
  }
  /**
   * Returns the Channel communicator, used by Actions
   * @return {Communicator} this._communicator
   * */
  getCommunicator() {
    return this._communicator;
  }
  /** MUST for runtime manager (main controller)*/
  setChannel(communicator) {
    this._communicator = communicator;
    this._communicator.setOnMessage((envelop)=>{
      const concreteCmd = envelop.content().type;
      const action = this._actions[concreteCmd];
      if (action) {
        action.execute(envelop);
      }
    });
  }
  // execCmd(cmd,params){
  //   let action = this._actions[cmd];
  //   if(action) {
  //     action.execute(params);
  //   }
  // }
}

module.exports = JsonRpcServer;

// new JsonRpcServer({port : 3939 , peerId : '0xergiohtdjhrorudhgiurdhgiurdhgirdiudrgihl'}).listen();
