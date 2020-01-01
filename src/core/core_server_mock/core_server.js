const zmq = require("zeromq");
const constants = require("../../common/constants");
const MsgTypes = constants.CORE_REQUESTS;
const report =
  "0x7b226964223a22313030333432373331303836343330353730363437323935303233313839373332373434323635222c2274696d657374616d70223a22323031382d30372d31355431363a30363a34372e393933323633222c22697376456e636c61766551756f7465537461747573223a2247524f55505f4f55545f4f465f44415445222c22706c6174666f726d496e666f426c6f62223a22313530323030363530343030303130303030303530353032303430313031303030303030303030303030303030303030303030373030303030363030303030303032303030303030303030303030304144414438354144453543383437343342394538414246323633383830384137353937413645454243454141364130343134323930383342334346323332443646373436433742313943383332313636443841424236304639304243453931373237303535353131354230303530463745363542383132353346373934463636354141222c22697376456e636c61766551756f7465426f6479223a2241674141414e6f4b414141484141594141414141414259422b56773575656f77662b717275514774772b3567624a736c684f58396557444e617a5770486842564241542f2f2f2f2f4141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141427741414141414141414148414141414141414141424968503233624c554e535a3179764649725a613070752f7a74362f6e335838714e6a4d566257674f4744414141414141414141414141414141414141414141414141414141414141414141414141414141414141434431786e6e6665724b4648443275765971545864444138695a32326b434435787737683338434d664f6e67414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141776544526c4e6d526b4d6a67304e7a646b4d324e6b5932517a4d5441334e544133596a59784e7a4d33595746684d5455354d5459774e7a414141414141414141414141414141414141414141414141414141414141227d";
const reportSig =
  "0x9e6a05bf42a627e3066b0067dc98bc22670df0061e42eed6a5af51ffa2e3b41949b6b177980b68c43855d4df71b2817b30f54bc40566225e6b721eb21fc0aba9b58e043bfaaae320e8d9613d514c0694b36b3fe41588b15480a6f7a4d025c244af531c7145d37f8b28c223bfb46c157470246e3dbd4aa15681103df2c8fd47bb59f7b827de559992fd24260e1113912bd98ba5cd769504bb5f21471ecd4f7713f600ae5169761c9047c09d186ad91f5ff89893c13be15d11bb663099192bcf2ce81f3cbbc28c9db93ce1a4df1141372d0d738fd9d0924d1e4fe58a6e2d12a5d2f723e498b783a6355ca737c4b0feeae3285340171cbe96ade8d8b926b23a8c90";
const DbUtils = require("../../common/DbUtils");
const Utils = require("../../common/utils");
const randomize = require("randomatic");
const validate = require("jsonschema").validate;
const SCHEMES = require("../core_messages_scheme");
const DB_PROVIDER = require("./data/provider_db");
const PROVIDERS_DB_MAP = Utils.transformStatesListToMap(DB_PROVIDER);

// Simulates core
// Holds a DB of states - its a map whose keys are addresses and each object is a map of states (key=>data)
class MockCoreServer {
  constructor(name) {
    this._socket = null;
    this._uri = null;
    this._db = null;
    this._signKey = null;
    if (name) {
      this._name = name;
    } else {
      this._name = null;
    }
  }

  static _validate(msg, scheme) {
    const finalScheme = Utils.applyDelta(SCHEMES.BASE_SCHEME, scheme);
    return validate(msg, finalScheme).valid;
  }

  static _send(socket, msg) {
    const error = { error: "from server error" };
    if (msg) {
      socket.send(JSON.stringify(msg));
    } else {
      socket.send(JSON.stringify(error));
    }
  }

  static _Error(msg) {
    return {
      id: msg.id,
      type: "Error",
      msg: "Message Error, Type: " + msg.type
    };
  }

  static get GET_PTT_REQUEST_MOCK() {
    return "no addresses";
  }

  static get GET_DEPLOY_BYTECODE_MOCK() {
    return "88987af7d35eabcad95915b93bfd3d2bc3308f06b7197478b0dfca268f0497dc";
  }

  static get GET_COMPUTE_OUTPUT_MOCK() {
    return "5678867878978978789789787878979845656666666abygjkljkljkj";
  }

  static _getPTTRequest(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.GetPTTRequest)) {
      return {
        id: msg.id,
        type: msg.type,
        result: {
          request: MockCoreServer.GET_PTT_REQUEST_MOCK,
          workerSig: "the-worker-sig"
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  static _PTTResponse(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.PTTResponse)) {
      return {
        id: msg.id,
        type: msg.type,
        result: {
          errors: []
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  static _getDeployTaskResult(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.DeploySecretContract)) {
      return {
        id: msg.id,
        type: msg.type,
        result: {
          output: MockCoreServer.GET_DEPLOY_BYTECODE_MOCK, // AKA exeCode
          preCodeHash: "hash-of-the-precode-bytecode",
          delta: { key: 0, data: [11, 2, 3, 5, 41, 44] },
          usedGas: "amount-of-gas-used",
          ethereumPayload: "hex of payload",
          ethereumAddress: "address of the payload",
          signature: "enclave-signature"
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  static _getComputeTaskResult(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.ComputeTask)) {
      return {
        id: msg.id,
        type: msg.type,
        result: {
          output: MockCoreServer.GET_COMPUTE_OUTPUT_MOCK,
          delta: { key: 0, data: [11, 2, 3, 5, 41, 44] },
          usedGas: "amount-of-gas-used",
          ethereumPayload: "hex of payload",
          ethereumAddress: "address of the payload",
          signature: "enclave-signature"
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  static _getContract(msg, db) {
    if (!MockCoreServer._validate(msg, SCHEMES.GetContract)) {
      return MockCoreServer._Error(msg);
    }
    const address = msg.input;
    const dbAddr = JSON.stringify(DbUtils.hexToBytes(address));
    let bcode = null;

    if (db[dbAddr]) {
      bcode = db[dbAddr][-1];
    }
    return {
      type: msg.type,
      id: msg.id,
      result: {
        address: address,
        bytecode: bcode
      }
    };
  }

  _writeToDB(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.UpdateDeltas)) {
      const deltas = msg.deltas;
      for (let delta of deltas) {
        let address = delta.address;
        if (!this._db[address]) {
          this._db[address] = {};
        }
        this._db[address][delta.key] = delta.data;
      }
    } else if (MockCoreServer._validate(msg, SCHEMES.UpdateNewContract)) {
      const contract_addr = msg.address;
      if (!this._db[contract_addr]) {
        this._db[contract_addr] = {};
      }
      this._db[contract_addr][-1] = msg.bytecode;
    } else if (MockCoreServer._validate(msg, SCHEMES.UpdateNewContractOnDeployment)) {
      const contract_addr = msg.address;
      const delta = msg.delta;
      if (!this._db[contract_addr]) {
        this._db[contract_addr] = {};
      }
      this._db[contract_addr][-1] = msg.bytecode;
      this._db[contract_addr][delta.key] = delta.data;
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  // response deltas : [{address,key,data},...]
  static _getDeltas(msg, db) {
    if (!MockCoreServer._validate(msg, SCHEMES.GetDeltas)) {
      return MockCoreServer._Error(msg);
    }
    const response = [];
    const input = msg.input;
    const inputMap = {};
    input.forEach(r => {
      const address = r.address;
      inputMap[address] = r;
    });
    for (let [address, data] of Object.entries(db)) {
      const dbAddr = DbUtils.toHexString(JSON.parse(address));
      if (inputMap[dbAddr]) {
        const from = inputMap[dbAddr].from;
        const to = inputMap[dbAddr].to;
        for (let key = from; key < to; key++) {
          if (data[key]) {
            response.push({
              address: dbAddr,
              key: key,
              data: data[key]
            });
          }
        }
      }
    }
    return {
      type: msg.type,
      id: msg.id,
      result: {
        deltas: response
      }
    };
  }

  setSigningKey(key) {
    this._signKey = key;
  }

  disconnect() {
    this._socket.disconnect(this._uri);
  }

  runServer(uri, db) {
    this._uri = uri;
    // a DB of states - its a map whose keys are addresses and each object is a map of states (key=>data)
    if (db) {
      this._db = db;
    } else {
      this._db = PROVIDERS_DB_MAP;
    }
    this._socket = zmq.socket("rep");
    this._socket.bindSync(uri);
    this._socket.on("message", msg => {
      msg = JSON.parse(msg);
      // if (process.env.NODE_ENV != "test") {
      if (this._name) {
        console.log("[Mock %s Server] got msg! ", this._name, msg.type);
      } else {
        console.log("[Mock Server] got msg! ", msg.type);
      }
      // }
      switch (msg.type) {
        case MsgTypes.GetRegistrationParams:
          const response = this._getRegistrationParams(msg);
          MockCoreServer._send(this._socket, response);
          break;
        case MsgTypes.GetAllTips:
          const allTips = this._getAllTips(msg);
          MockCoreServer._send(this._socket, allTips);
          break;
        case MsgTypes.GetTips:
          const tips = this._getTips(msg);
          MockCoreServer._send(this._socket, tips);
          break;
        case MsgTypes.GetAllAddrs:
          const addrs = this._getAllAddrs(msg);
          MockCoreServer._send(this._socket, addrs);
          break;
        case MsgTypes.GetDeltas:
          const deltas = MockCoreServer._getDeltas(msg, this._db);
          MockCoreServer._send(this._socket, deltas);
          break;
        case MsgTypes.GetContract:
          const contract = MockCoreServer._getContract(msg, this._db);
          MockCoreServer._send(this._socket, contract);
          break;
        case MsgTypes.UpdateNewContract:
        case MsgTypes.UpdateNewContractOnDeployment:
        case MsgTypes.UpdateDeltas:
        // Uncomment after fixing failed unit-tests (which fail due to some test dependencies)
        //this._writeToDB(msg);
        case MsgTypes.RemoveContract:
        case MsgTypes.RemoveDeltas:
          // TODO: add remove from TmpDB, once required for UT
          MockCoreServer._send(this._socket, {
            type: msg.type,
            id: msg.id,
            status: constants.CORE_RESPONSE_STATUS_CODES.OK
          });
          break;
        case MsgTypes.NewTaskEncryptionKey:
          const encKeyMsg = this._getNewTaskEncryptionKey(msg);
          MockCoreServer._send(this._socket, encKeyMsg);
          break;
        case MsgTypes.DeploySecretContract:
          MockCoreServer._send(this._socket, MockCoreServer._getDeployTaskResult(msg));
          break;
        case MsgTypes.ComputeTask:
          MockCoreServer._send(this._socket, MockCoreServer._getComputeTaskResult(msg));
          break;
        case MsgTypes.GetPTTRequest:
          MockCoreServer._send(this._socket, MockCoreServer._getPTTRequest(msg));
          break;
        case MsgTypes.PTTResponse:
          MockCoreServer._send(this._socket, MockCoreServer._PTTResponse(msg));
          break;

        default:
          if (process.env.NODE_ENV != "test") {
            console.log("[Mock Server] Unknown command: ", msg);
          }
      }
    });
  }

  // input = [{address, from:key,to:key},...]

  _getNewTaskEncryptionKey(msg) {
    if (this._signKey === null) {
      this._signKey = randomize("Aa0", 40);
    }
    if (MockCoreServer._validate(msg, SCHEMES.NewTaskEncryptionKey)) {
      return {
        id: msg.id,
        type: msg.type,
        senderKey: this._signKey,
        result: {
          workerEncryptionKey:
            "0061d93b5412c0c99c3c7867db13c4e13e51292bd52565d002ecf845bb0cfd8adfa5459173364ea8aff3fe24054cca88581f6c3c5e928097b9d4d47fce12ae47",
          workerSig: "worker-signature-with-signed-by-the-private-key-of-the-sender-key"
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  _getAllAddrs(msg) {
    if (!MockCoreServer._validate(msg, SCHEMES.GetAllAddrs)) {
      return MockCoreServer._Error(msg);
    }
    const addresses = Object.keys(this._db).map(address => {
      const byteArray = JSON.parse(address);
      return DbUtils.toHexString(byteArray);
    });
    return {
      type: msg.type,
      id: msg.id,
      result: {
        addresses: addresses
      }
    };
  }

  _retrieveTipsFromDB() {
    let tips = [];
    for (const key of Object.keys(this._db)) {
      const address = key;
      const addressByteArray = JSON.parse(address);
      const maxKey = Object.keys(this._db[address]).reduce((a, b) => (a > b ? a : b));
      const data = this._db[address][maxKey];
      const tip = {
        address: addressByteArray,
        key: parseInt(maxKey),
        data: data
      };
      tips.push(tip);
    }
    return tips;
  }

  _getAllTips(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.GetAllTips)) {
      return {
        type: msg.type,
        id: msg.id,
        result: {
          tips: this._retrieveTipsFromDB()
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  _getTips(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.GetTips)) {
      let tips = [];
      for (let i = 0; i < msg.input.length; i++) {
        const address = JSON.stringify(DbUtils.hexToBytes(msg.input[i]));
        if (!(address in this._db)) {
          return MockCoreServer._Error(msg);
        }
        const maxKey = Object.keys(this._db[address]).reduce((a, b) => (a > b ? a : b));
        const data = this._db[address][maxKey];
        let tip = {
          address: msg.input[i],
          key: maxKey,
          data: data
        };
        tips.push(tip);
      }
      return {
        type: msg.type,
        id: msg.id,
        result: {
          tips: tips
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  _getRegistrationParams(msg) {
    if (this._signKey === null) {
      this._signKey = "0x" + randomize("?0", 40, { chars: "abcdef" });
    }
    if (MockCoreServer._validate(msg, SCHEMES.GetAllTips)) {
      return {
        type: msg.type,
        id: msg.id,
        result: {
          signingKey: this._signKey,
          report: report,
          signature: reportSig
        }
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }
}

module.exports = MockCoreServer;
