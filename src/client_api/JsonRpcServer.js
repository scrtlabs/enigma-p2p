/**
 * This class is responsible for interacting with users.
 * i.e if this node is also a proxy node then it can connect to dApp users.
 * and do stuff like: broadcast computeTask, get other workers PubKey etc.
 * */
const EventEmitter = require("events").EventEmitter;
const constants = require("../common/constants");
const jayson = require("jayson");
const cors = require("cors");
const connect = require("connect");
const bodyParser = require("body-parser");

const PROXY_FLAG = constants.MAIN_CONTROLLER_NOTIFICATIONS.Proxy;
const Envelop = require("../main_controller/channels/Envelop");

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
    this._server = jayson.server(
      {
        getInfo: (args, callback) => {
          console.log("getInfo request...");
          callback(null, { peerId: this._peerId, status: "ok" });
        },
        getWorkerEncryptionKey: async (args, callback) => {
          if (args.userPubKey && args.workerAddress) {
            this._logger.info("[+] JsonRpc: getWorkerEncryptionKey");
            const workerSignKey = args.workerAddress;
            const userPubKey = args.userPubKey;
            const content = {
              workerSignKey: workerSignKey,
              userPubKey: userPubKey,
              type: constants.CORE_REQUESTS.NewTaskEncryptionKey
            };
            let coreRes = await this._routeNext(content);
            if (coreRes === null) {
              return callback({
                code: this._SERVER_ERR,
                message: "Server error"
              });
            }
            return callback(null, coreRes);
          } else {
            return callback({
              code: this._INVALID_PARAM,
              message: "Invalid params"
            });
          }
        },
        deploySecretContract: async (args, callback) => {
          if (this._shouldRouteMessage(args)) {
            this._logger.info("[+] JsonRpc: deploySecretContract");
            let expected = ["workerAddress", "preCode", "encryptedArgs", "encryptedFn", "userDHKey", "contractAddress"];
            this._routeTask(constants.CORE_REQUESTS.DeploySecretContract, expected, args, callback);
          } else {
            //TODO:: message directed to self worker, handle
          }
        },
        sendTaskInput: async (args, callback) => {
          if (this._shouldRouteMessage(args)) {
            this._logger.info("[+] JsonRpc: sendTaskInput");
            let expected = ["taskId", "workerAddress", "encryptedArgs", "encryptedFn", "userDHKey", "contractAddress"];
            this._routeTask(constants.CORE_REQUESTS.ComputeTask, expected, args, callback);
          } else {
            //TODO:: message directed to self worker, handle
          }
        },
        getTaskStatus: async (args, callback) => {
          if (args.workerAddress && args.taskId) {
            this._logger.info("[+] JsonRpc: getTaskStatus");
            let coreRes = await this._routeNext({
              taskId: args.taskId,
              workerAddress: args.workerAddress,
              withResult: args.withResult,
              type: constants.NODE_NOTIFICATIONS.GET_TASK_STATUS
            });
            if (coreRes === null) {
              return callback({
                code: this._SERVER_ERR,
                message: "Server error"
              });
            }
            if (!("withResult" in args && args.withResult === true)) {
              coreRes.output = null;
            }
            return callback(null, coreRes);
          } else {
            return callback({
              code: this._INVALID_PARAM,
              message: "Invalid params"
            });
          }
        },
        getTaskResult: async (args, callback) => {
          if (args.taskId) {
            this._logger.info("[+] JsonRpc: getTaskResult");
            let coreRes = await this._routeNext({
              taskId: args.taskId,
              type: constants.NODE_NOTIFICATIONS.GET_TASK_RESULT
            });
            if (coreRes === null) {
              return callback({
                code: this._SERVER_ERR,
                message: "Server error"
              });
            }
            return callback(null, coreRes);
          } else {
            return callback({
              code: this._INVALID_PARAM,
              message: "Invalid params"
            });
          }
        }
      },
      {
        collect: true // collect params in a single argument
      }
    );
  }
  async _routeNext(content) {
    const envelop = new Envelop(true, content, PROXY_FLAG);
    try {
      let resEnv = await this.getCommunicator().sendAndReceive(envelop);
      let result = resEnv.content();
      return result;
    } catch (e) {
      this._logger.error("[-] JsonRpc ERR: " + e);
      return null;
    }
  }
  async _routeTask(type, expectedFields, args, callback) {
    let isMissing = expectedFields.some(attr => {
      return !(attr in args);
    });
    if (isMissing) {
      return callback({ code: this._INVALID_PARAM, message: "Invalid params" });
    }
    this._logger.info("[+] JsonRpc: " + type);
    let coreRes = await this._routeNext({
      type: type,
      request: args
    });
    let clientResult = {};
    clientResult.sendTaskResult = false;
    if (coreRes && coreRes.result && "sent" in coreRes.result) {
      clientResult.sendTaskResult = coreRes.result.sent;
    }
    return callback(null, clientResult);
  }
  /**
   * TODO:: this function should check the workerAddress
   * TODO:: if equals to self address than DO NOT route next
   * */
  _shouldRouteMessage(args) {
    return true;
  }
  listen() {
    this._logger.debug("JsonRpcServer listening on port " + this._port);
    this._app.use(cors({ methods: ["POST"] }));
    this._app.use(bodyParser.json({ limit: "20mb" }));
    this._app.use(bodyParser.urlencoded({ limit: "20mb", extended: true }));
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
  }
}

module.exports = JsonRpcServer;
// new JsonRpcServer({port : 3939 , peerId : '0xergiohtdjhrorudhgiurdhgiurdhgirdiudrgihl'}).listen();
// curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"getInfo", "params":[]}' 127.0.0.1:3939
// curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"getWorkerEncryptionKey","params":{"workerAddress":"0xda8a0cb626dc1bad0482bd2f9c950d194e0a9bec","userPubKey":"66666666666666666"}}' 127.0.0.1:3346
// curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"deploySecretContract","params":{"workerAddress":"0xedf9577b9d1610ca2737911b98152a463e9e2c46","preCode":"0x8e68b14d5bf0ffcf5dcc5cd538be0ef9958e3573","encryptedArgs":"66666666666666666","encryptedFn":"66666666666666666","userDHKey":"66666666666666666","contractAddress":"66666666666666666"}}' 127.0.0.1:3346
