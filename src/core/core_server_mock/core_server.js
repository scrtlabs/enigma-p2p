const zmq = require('zeromq');
const constants = require('../../common/constants');
const MsgTypes = constants.CORE_REQUESTS;
const report = '0x7b226964223a22313030333432373331303836343330353730363437323935303233313839373332373434323635222c2274696d657374616d70223a22323031382d30372d31355431363a30363a34372e393933323633222c22697376456e636c61766551756f7465537461747573223a2247524f55505f4f55545f4f465f44415445222c22706c6174666f726d496e666f426c6f62223a22313530323030363530343030303130303030303530353032303430313031303030303030303030303030303030303030303030373030303030363030303030303032303030303030303030303030304144414438354144453543383437343342394538414246323633383830384137353937413645454243454141364130343134323930383342334346323332443646373436433742313943383332313636443841424236304639304243453931373237303535353131354230303530463745363542383132353346373934463636354141222c22697376456e636c61766551756f7465426f6479223a2241674141414e6f4b414141484141594141414141414259422b56773575656f77662b717275514774772b3567624a736c684f58396557444e617a5770486842564241542f2f2f2f2f4141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141427741414141414141414148414141414141414141424968503233624c554e535a3179764649725a613070752f7a74362f6e335838714e6a4d566257674f4744414141414141414141414141414141414141414141414141414141414141414141414141414141414141434431786e6e6665724b4648443275765971545864444138695a32326b434435787737683338434d664f6e67414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141776544526c4e6d526b4d6a67304e7a646b4d324e6b5932517a4d5441334e544133596a59784e7a4d33595746684d5455354d5459774e7a414141414141414141414141414141414141414141414141414141414141227d';
const reportSig = '0x9e6a05bf42a627e3066b0067dc98bc22670df0061e42eed6a5af51ffa2e3b41949b6b177980b68c43855d4df71b2817b30f54bc40566225e6b721eb21fc0aba9b58e043bfaaae320e8d9613d514c0694b36b3fe41588b15480a6f7a4d025c244af531c7145d37f8b28c223bfb46c157470246e3dbd4aa15681103df2c8fd47bb59f7b827de559992fd24260e1113912bd98ba5cd769504bb5f21471ecd4f7713f600ae5169761c9047c09d186ad91f5ff89893c13be15d11bb663099192bcf2ce81f3cbbc28c9db93ce1a4df1141372d0d738fd9d0924d1e4fe58a6e2d12a5d2f723e498b783a6355ca737c4b0feeae3285340171cbe96ade8d8b926b23a8c90';
const DbUtils = require('../../common/DbUtils');
const Utils = require('../../common/utils');
const DB_PROVIDER = require('./data/provider_db');
const randomize = require('randomatic');
const validate = require('jsonschema').validate;
const SCHEMES = require('../core_messages_scheme');


class MockCoreServer {
  constructor(name) {
    this._socket = null;
    this._uri = null;
    this._isProvider = false;
    this._signKey = null; //"0x5e9c469c2cb6cab4f15b64a39311297c48812a89";
    this._receiverTips = DEFAULT_TIPS;
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
    const error = {'error': 'from server error'};
    if (msg) {
      socket.send(JSON.stringify(msg));
    } else {
      socket.send(JSON.stringify(error));
    }
  }

  static _Error(msg) {
    return {
      id: msg.id,
      type: 'Error',
      msg: 'Message Error, Type: ' + msg.type,
    };
  }

  static _getPTTRequest(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.GetPTTRequest)) {
      return {
        id: msg.id,
        type: msg.type,
        result: {
          request: 'the-message-packed-request',
          workerSig: 'the-worker-sig',
        },
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
          errors: [],
        },
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
          output: [22,22,22,22,22,33,44,44,44,44,44,44,44,55,66,77,88,99], // AKA exeCode
          preCodeHash: 'hash-of-the-precode-bytecode',
          delta: {key: 0, data: [11, 2, 3, 5, 41, 44]},
          usedGas: 'amount-of-gas-used',
          ethereumPayload: 'hex of payload',
          ethereumAddress: 'address of the payload',
          signature: 'enclave-signature',
        },
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
          output: 'the-output-of-the-execution',
          delta: {key: 0, data: [11, 2, 3, 5, 41, 44]},
          usedGas: 'amount-of-gas-used',
          ethereumPayload: 'hex of payload',
          ethereumAddress: 'address of the payload',
          signature: 'enclave-signature',
        },
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  static _getContract(msg) {
    if (!MockCoreServer._validate(msg, SCHEMES.GetContract)) {
      return MockCoreServer._Error(msg);
    }
    let bcode = null;
    let contractAddr = null;
    const address = msg.input;
    // if (address.slice(0, 2) === '0x') {
    //   address = address.slice(2, address.length);
    // }
    DB_PROVIDER.forEach((entry) => {
      if (address === DbUtils.toHexString(entry.address) && entry.key === -1) {
        bcode = entry.data;
        contractAddr = DbUtils.toHexString(entry.address);
      }
    });
    return {
      type: msg.type,
      id: msg.id,
      address: contractAddr,
      bytecode: bcode,
    };
  }

  // response deltas : [{address,key,data},...]
  static _getDeltas(msg) {
    if (!MockCoreServer._validate(msg, SCHEMES.GetDeltas)) {
      return MockCoreServer._Error(msg);
    }
    const response = [];
    const input = msg.input;
    const inputMap = {};
    input.forEach((r) => {
      const address = r.address;
      // if (address.slice(0, 2) === '0x') {
      //   address = address.slice(2, address.length);
      // }
      inputMap[address] = r;
    });
    DB_PROVIDER.forEach((entry) => {
      const dbAddr = DbUtils.toHexString(entry.address);
      const dbIndex = entry.key;
      if (inputMap[dbAddr]) {
        const from = inputMap[dbAddr].from;
        const to = inputMap[dbAddr].to;
        if (dbIndex >= from && dbIndex <= to) {
          response.push({
            address: dbAddr,
            key: dbIndex,
            data: entry.data,
          });
        }
      }
    });
    return {
      type: msg.type,
      id: msg.id,
      deltas: response,
    };
  }

  setProvider(isProvider) {
    this._isProvider = isProvider;
  };

  setReceiverTips(tips) {
    this._receiverTips = tips;
  };

  setSigningKey(key) {
    this._signKey = key;
  };

  disconnect() {
    this._socket.disconnect(this._uri);
  };

  runServer(uri) {
    this._uri = uri;
    this._socket = zmq.socket('rep');
    this._socket.bindSync(uri);

    this._socket.on('message', (msg) => {
      msg = JSON.parse(msg);
      if (this._name) {
        console.log('[Mock %s Server] got msg! ', this._name, msg.type);
      } else {
        console.log('[Mock Server] got msg! ', msg.type);
      }
      switch (msg.type) {
        case MsgTypes.GetRegistrationParams:
          const response = this._getRegistrationParams(msg);
          MockCoreServer._send(this._socket, response);
          break;
        case MsgTypes.GetAllTips:
          const tips = this._getAllTips(msg);
          MockCoreServer._send(this._socket, tips);
          break;
        case MsgTypes.GetAllAddrs:
          const addrs = this._getAllAddrs(msg);
          MockCoreServer._send(this._socket, addrs);
          break;
        case MsgTypes.GetDeltas:
          const deltas = MockCoreServer._getDeltas(msg);
          MockCoreServer._send(this._socket, deltas);
          break;
        case MsgTypes.GetContract:
          const contract = MockCoreServer._getContract(msg);
          MockCoreServer._send(this._socket, contract);
          break;
        case MsgTypes.UpdateNewContract:
        case MsgTypes.UpdateDeltas:
          MockCoreServer._send(this._socket, {
            type: msg.type,
            id: msg.id,
            success: true,
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
          console.log('[Mock Server] Unknown command: ', msg);
      }
    });
  };

  // input = [{address, from:key,to:key},...]

  _getNewTaskEncryptionKey(msg) {
    if (this._signKey === null) {
      this._signKey = randomize('Aa0', 40);
    }
    if (MockCoreServer._validate(msg, SCHEMES.NewTaskEncryptionKey)) {
      return {
        id: msg.id,
        type: msg.type,
        senderKey: this._signKey,
        result: {
          workerEncryptionKey: '0061d93b5412c0c99c3c7867db13c4e13e51292bd52565d002ecf845bb0cfd8adfa5459173364ea8aff3fe24054cca88581f6c3c5e928097b9d4d47fce12ae47',
          workerSig: 'worker-signature-with-signed-by-the-private-key-of-the-sender-key',
        },
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  _getAllAddrs(msg) {
    if (!MockCoreServer._validate(msg, SCHEMES.GetAllAddrs)) {
      return MockCoreServer._Error(msg);
    }
    let addresses;
    if (this._isProvider) {
      addresses = DB_PROVIDER.map((o) => {
        if (o.key < 0) {
          return DbUtils.toHexString(o.address);
        } else {
          return [];
        }
      }).filter((o) => {
        return o.length > 0;
      });
    } else {
      addresses = this._receiverTips.map((tip) => {
        return DbUtils.toHexString(tip.address);
      });
    }
    return {
      type: msg.type,
      id: msg.id,
      result: {
        addresses: addresses,
      },
    };
  }

  _getAllTips(msg) {
    if (MockCoreServer._validate(msg, SCHEMES.GetAllTips)) {
      return {
        type: msg.type,
        id: msg.id,
        tips: this._receiverTips,
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }

  _getRegistrationParams(msg) {
    if (this._signKey === null) {
      this._signKey = '0x' + randomize('?0', 40, {chars: 'abcdef'});
    }
    if (MockCoreServer._validate(msg, SCHEMES.GetAllTips)) {
      return {
        type: msg.type,
        id: msg.id,
        result: {
          signingKey: this._signKey,
          report: report,
          signature: reportSig,
        },
      };
    } else {
      return MockCoreServer._Error(msg);
    }
  }
}


const DEFAULT_TIPS = [{
  address: [92, 214, 171, 4, 67, 94, 118, 195, 84, 97, 103, 199, 97, 21, 226, 55, 220, 143, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 79, 181, 127],
  key: 10,
  data: [171, 255, 84, 134, 4, 62, 190, 60, 15, 43, 249, 32, 21, 188, 170, 27, 22, 23, 8, 248, 158, 176, 219, 85, 175, 190, 54, 199, 198, 228, 198, 87, 124, 33, 158, 115, 60, 173, 162, 16,
    150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
    207, 92, 200, 194, 48, 70, 71, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 214, 256, 22, 229, 31,
    56, 90, 104, 16, 241, 108, 14, 126, 116, 91, 106, 10, 141, 122, 78, 214, 148, 194, 14, 31, 96, 142, 178, 96, 150, 52, 142, 138, 37, 209, 110,
    153, 185, 96, 236, 44, 46, 192, 138, 108, 168, 91, 145, 153, 60, 88, 7, 229, 183, 174, 187, 204, 233, 54, 89, 107, 16, 237, 247, 66, 76, 39,
    82, 253, 160, 2, 1, 133, 210, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 77, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 144,
    90, 20, 76, 41, 98, 111, 25, 84, 7, 71, 84, 27, 124, 190, 86, 16, 136, 16, 198, 76, 215, 164, 228, 117, 182, 238, 213, 52, 253, 105, 152, 215, 197, 95, 244, 65, 186, 140, 45, 167, 114, 24, 139, 199, 179, 116, 105, 181],
}, {
  address: [11, 214, 171, 4, 67, 23, 118, 195, 84, 34, 103, 199, 97, 21, 226, 55, 220, 143, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 200],
  key: 34,
  data: [11, 255, 84, 134, 4, 62, 190, 60, 15, 43, 249, 32, 21, 188, 170, 27, 22, 23, 8, 248, 158, 176, 219, 85, 175, 190, 54, 199, 198, 228, 198, 87, 124, 33, 158, 115, 60, 173, 162, 16,
    150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    56, 90, 104, 16, 241, 108, 14, 126, 116, 91, 106, 10, 141, 122, 78, 214, 148, 194, 14, 31, 96, 142, 178, 96, 150, 52, 142, 138, 37, 209, 110,
    153, 185, 96, 236, 44, 46, 192, 138, 108, 168, 91, 145, 153, 60, 88, 7, 229, 183, 174, 187, 204, 233, 54, 89, 107, 16, 237, 247, 66, 76, 39,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 144,
    141, 221, 46, 22, 81, 13, 87, 209, 68, 197, 189, 10, 130, 182, 34, 16, 198, 180,
    90, 20, 76, 41, 98, 111, 25, 84, 7, 71, 84, 27, 124, 190, 86, 16, 136, 16, 198, 76, 215, 164, 228, 117, 182, 238, 213, 52, 253, 105, 152, 215, 197, 95, 244, 65, 186, 140, 45, 167, 114],
},
{
  address: [76, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 33],
  key: 0,
  data: [150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88],
}];

module.exports = MockCoreServer;

