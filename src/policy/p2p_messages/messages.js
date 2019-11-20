const Policy = require("../policy");
const utils = require("../../common/utils");

class Msg {
  constructor(msg) {
    this.rawMsg = msg;
    this.policy = new Policy();
    this.validJsonRpc = this.validateMessage();
    // make immutable
    if (new.target === Msg) {
      Object.freeze(this);
    }
  }
  validateMessage() {
    return this.policy.validJsonRpc(this.rawMsg);
  }
  jsonrpc() {
    return this.rawMsg["jsonrpc"];
  }
  method() {
    return this.rawMsg["method"];
  }
  id() {
    return this.rawMsg["id"];
  }
  isValidJsonRpc() {
    return this.validJsonRpc;
  }
  toJSON() {
    return this.rawMsg;
  }
}

class HeartBeatReqMsg extends Msg {
  constructor(msgParams) {
    let finalMsg;

    if (utils.isString(msgParams)) {
      msgParams = JSON.parse(msgParams);
    }

    if ("jsonrpc" in msgParams) {
      finalMsg = msgParams;
    } else if ("from" in msgParams && "to" in msgParams) {
      finalMsg = {
        jsonrpc: "2.0",
        method: "heartbeat",
        params: [
          {
            from: msgParams.from,
            to: msgParams.to
          }
        ],
        id: utils.randId()
      };
    }

    super(finalMsg);
    if (new.target === HeartBeatReqMsg) {
      Object.freeze(this);
    }
  }
  from() {
    return this.rawMsg["params"][0]["from"];
  }
  to() {
    return this.rawMsg["params"][0]["to"];
  }
  toNetworkStream() {
    return JSON.stringify(this);
  }
  isValidMsg() {
    // TODO:: add extra checks.
    return this.isValidJsonRpc();
  }
}

class HeartBeatResMsg extends Msg {
  constructor(msgParams) {
    let finalMsg;

    if (utils.isString(msgParams)) {
      msgParams = JSON.parse(msgParams);
    }
    if ("jsonrpc" in msgParams && "result" in msgParams) {
      finalMsg = msgParams;
    } else if ("from" in msgParams && "to" in msgParams && "id" in msgParams) {
      finalMsg = {
        jsonrpc: "2.0",
        result: {
          from: msgParams.from,
          to: msgParams.to,
          type: "heartbeat"
        },
        id: msgParams.id
      };
    }

    super(finalMsg);
    if (new.target === HeartBeatResMsg) {
      Object.freeze(this);
    }
  }
  from() {
    return this.rawMsg["result"]["from"];
  }
  to() {
    return this.rawMsg["result"]["to"];
  }
  type() {
    return this.rawMsg["result"]["type"];
  }
  toNetworkStream() {
    return JSON.stringify(this);
  }
  isValidMsg() {
    // TODO:: add extra checks.
    return this.isValidJsonRpc();
  }
  isCompatibleWithMsg(heartBeatRequest) {
    // TODO:: add extra checks.
    const validJsonRpc = this.isValidJsonRpc();
    const shouldId = heartBeatRequest.id();
    const currentId = this.id();
    const shouldTo = heartBeatRequest.from();
    const currentTo = this.to();
    if (shouldId === currentId && shouldTo === currentTo) {
      return validJsonRpc;
    }
    return false;
  }
}

class FindPeersReqMsg extends Msg {
  constructor(msgParams) {
    let finalMsg;

    if (utils.isString(msgParams)) {
      msgParams = JSON.parse(msgParams);
    }

    if ("jsonrpc" in msgParams) {
      finalMsg = msgParams;
    } else if (
      "from" in msgParams &&
      "to" in msgParams &&
      "maxpeers" in msgParams
    ) {
      finalMsg = {
        jsonrpc: "2.0",
        method: "findpeers_req",
        params: [
          {
            from: msgParams.from,
            to: msgParams.to,
            maxpeers: msgParams.maxpeers
          }
        ],
        id: utils.randId()
      };
    }

    super(finalMsg);

    if (new.target === FindPeersReqMsg) {
      Object.freeze(this);
    }
  }
  from() {
    return this.rawMsg["params"][0]["from"];
  }
  to() {
    return this.rawMsg["params"][0]["to"];
  }
  toNetworkStream() {
    return JSON.stringify(this);
  }
  isValidMsg() {
    // TODO:: add extra checks.
    return this.isValidJsonRpc();
  }
  maxPeers() {
    return this.rawMsg["params"][0]["maxpeers"];
  }
}

class FindPeersResMsg extends Msg {
  constructor(msgParams) {
    let finalMsg;
    if (utils.isString(msgParams)) {
      msgParams = JSON.parse(msgParams);
    }
    if ("jsonrpc" in msgParams && "result" in msgParams) {
      finalMsg = msgParams;
    } else if (
      "from" in msgParams &&
      "to" in msgParams &&
      "peers" in msgParams &&
      "id" in msgParams
    ) {
      finalMsg = {
        jsonrpc: "2.0",
        result: {
          from: msgParams.from,
          to: msgParams.to,
          peers: msgParams.peers
        },
        id: msgParams.id
      };
    }

    super(finalMsg);

    if (new.target === FindPeersResMsg) {
      Object.freeze(this);
    }
  }
  from() {
    return this.rawMsg["result"]["from"];
  }
  to() {
    return this.rawMsg["result"]["to"];
  }
  peers() {
    return this.rawMsg["result"]["peers"];
  }
  toNetworkStream() {
    return JSON.stringify(this);
  }
  isValidMsg() {
    // TODO:: add extra checks.
    return this.isValidJsonRpc();
  }
  isCompatibleWithMsg(findPeersRequest) {
    // TODO:: add extra checks.
    const validJsonRpc = this.isValidJsonRpc();
    const shouldId = findPeersRequest.id();
    const currentId = this.id();
    const shouldTo = findPeersRequest.from();
    const currentTo = this.to();
    if (shouldId === currentId && shouldTo === currentTo) {
      return validJsonRpc;
    }
    return false;
  }
}

module.exports.HeartBeatReqMsg = HeartBeatReqMsg;
module.exports.HeartBeatResMsg = HeartBeatResMsg;
module.exports.FindPeersReqMsg = FindPeersReqMsg;
module.exports.FindPeersResMsg = FindPeersResMsg;
