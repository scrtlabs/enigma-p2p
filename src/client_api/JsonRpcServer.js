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
    this._INVALID_PARAM = -32602;
    this._SERVER_ERR = -32000;
    this._communicator = null;
    this._logger = logger;
    this._port = config.port || constants.JSON_RPC_SERVER.port;
    this._peerId = config.peerId;

    this._app = connect();
    this._server = jayson.server({
      getInfo: (args, callback)=>{
        console.log('getInfo request...');
        callback(null, {peerId: this._peerId, status: 'ok'});
      },
      getWorkerEncryptionKey: async (args, callback)=>{
        if(args.userPubKey && args.workerAddress){
          console.log("[+] JsonRpc: getWorkerEncryptionKey" );
          const workerSignKey = args.workerAddress;
          const userPubKey = args.userPubKey;
          const content = {
            workerSignKey: workerSignKey,
            userPubKey: userPubKey,
            type: constants.CORE_REQUESTS.NewTaskEncryptionKey,
          };
          let coreRes = await this._sendToCore(content);
          if(coreRes === null){
            return callback({'code': this._SERVER_ERR , 'message': 'Server error'});
          }
          let result = {
            workerEncryptionKey: coreRes.result.workerEncryptionKey,
            workerSig:coreRes.result.workerSig
          };
          return callback(null, result);
        }else{
          return callback({'code': this._INVALID_PARAM , 'message': 'Invalid params'});
        }
      },
      // Placeholder.
      // TODO: Implement proper callback
      deploySecretContract: async function(args, callback) {
        let expected = ['preCode','encryptedArgs','encryptedFn','userDHKey','contractAddress'];
        let isMissing = expected.some(attr=>{
          return !(attr in args);
        });
        if(isMissing){
          return callback({'code': this._INVALID_PARAM , 'message': 'Invalid params'});
        }else{
          console.log('[+] JsonRpc: deploySecretContract');
          let coreRes = await this._sendToCore({
            type : '',
            request : args,
          });
          callback(null, true);
        }
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
          callback(null, true);
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
  async _sendToCore(content){
    const envelop = new Envelop(true,content, PROXY_FLAG);
    try{
      let resEnv= await this.getCommunicator().sendAndReceive(envelop)
      return resEnv.content();
    }catch(e){
      console.log("[-] JsonRpc ERR: " + e);
      return null;
    }
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
  _isValidFields(msg){
    // IPC
    // preCode: 'the-bytecode',
    //     encryptedArgs: 'hex of the encrypted args',
    //     encryptedFn: 'hex of the encrypted function signature',
    //     userPubKey: 'the-user-dh-pubkey',
    //     gasLimit: 'the-user-selected-gaslimit',
    //     contractAddress: 'the-address-of-the-contract'
    // RPC
    // preCode (String) - The hash of the compiled bytecode
    // encryptedArgs (String) - Encrypted RLP-encoded args needed for the secret contract's constructor
    // encryptedFn (String) -Encypted function that needs to be called
    // userDHKey (String) - User's public key from Diffie-Hellman
    // contractAddress (String) - Also serves as taskId, and can be recreated by anyone. H(userAddress, nonce)

    // let expected = ['taskId','status','output','delta','usedGas','ethereumPayload','ethereumAddress','signature','preCodeHash'];
    let isMissing = expected.some(attr=>{
      return !(attr in msg);
    });
    if(isMissing){
      return null;
    }
    // if(typeof args === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.taskId === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.creationBlockNumber === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.sender === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.scAddr === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.encryptedFn === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.encryptedEncodedArgs === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.userTaskSig === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.userPubKey === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.fee === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // } else if (typeof args.msgId === "undefined") {
    //   callback({code: -32602, message: "Invalid params"});
    // }
  }
}

module.exports = JsonRpcServer;

// new JsonRpcServer({port : 3939 , peerId : '0xergiohtdjhrorudhgiurdhgiurdhgirdiudrgihl'}).listen();
