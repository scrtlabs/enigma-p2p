const assert = require("assert");
const syncMsgs = require("../src/policy/p2p_messages/sync_messages");
const schemeValidator = require("../src/policy/p2p_messages/schemes/SchemeValidator");
const constants = require("../src/common/constants");
const MsgTypes = constants.P2P_MESSAGES;

it("should scheme validate state sync req", function(done) {
  let state_sync_req_obj = {
    msgType: "SYNC_STATE_REQ",
    contractAddress: "0x...",
    fromIndex: 1,
    toIndex: 101,
    fromHash: "0x...",
    toHash: "0x..."
  };

  schemeValidator.validateScheme(state_sync_req_obj, MsgTypes.SYNC_STATE_REQ, (err, isValid) => {
    if (err) {
      assert.strictEqual(false, true, err);
    } else {
      assert.strictEqual(true, isValid, "invalid scheme");
    }
    done();
  });
});

it("should scheme validate state sync res", function(done) {
  let state_sync_res_obj = {
    msgType: "SYNC_STATE_RES",
    contractAddress: "0x...",
    states: [
      { index: 1, hash: "0x1", data: [11, 12, 13] },
      { index: 2, hash: "0x2", data: [311, 122, 133] },
      { index: 3, hash: "0x3", data: [151, 152, 143] }
    ]
  };

  schemeValidator.validateScheme(state_sync_res_obj, MsgTypes.SYNC_STATE_RES, (err, isValid) => {
    if (err) {
      assert.strictEqual(false, true, err);
    } else {
      assert.strictEqual(true, isValid, "invalid scheme");
    }
    done();
  });
});

/*
it("should build state sync req msg from obj", function(done) {
  let state_sync_req_obj = {
    msgType: "SYNC_STATE_REQ",
    contractAddress: "0x...",
    fromIndex: 1,
    toIndex: 101,
    fromHash: "0x...",
    toHash: "0x..."
  };

  syncMsgs.MsgBuilder.stateRequestMessage(state_sync_req_obj, (err, msg) => {
    if (err) {
      assert.strictEqual(false, true, err);
    } else {
      assert.strictEqual(state_sync_req_obj.contractAddress, msg.contractAddress(), "addrs dont match ");
      assert.strictEqual(state_sync_req_obj.toIndex, msg.toIndex(), "to index dont match ");
    }
    done();
  });
});

it("should build state sync msg res from obj", function(done) {
  const state_sync_res_obj = {
    msgType: "SYNC_STATE_RES",
    contractAddress: "0x...",
    states: [
      { index: 1, hash: "0x1", data: [11, 12, 13] },
      { index: 2, hash: "0x2", data: [311, 122, 133] },
      { index: 3, hash: "0x3", data: [151, 152, 143] }
    ]
  };

  syncMsgs.MsgBuilder.stateResponseMessage(state_sync_res_obj, (err, msg) => {
    if (err) {
      assert.strictEqual(false, true, err);
    } else {
      assert.strictEqual(state_sync_res_obj.contractAddress, msg.contractAddress(), "addrs dont match ");
      assert.strictEqual(state_sync_res_obj.states.length, msg.states().length, "states len dont match ");
    }
    done();
  });
});

it("should test to network req msg", function(done) {
  let state_sync_req_obj = {
    msgType: "SYNC_STATE_REQ",
    contractAddress: "0x...",
    fromIndex: 1,
    toIndex: 101,
    fromHash: "0x...",
    toHash: "0x..."
  };

  let shouldBeNetwork = [
    217,
    118,
    123,
    34,
    99,
    111,
    110,
    116,
    114,
    97,
    99,
    116,
    65,
    100,
    100,
    114,
    101,
    115,
    115,
    34,
    58,
    34,
    48,
    120,
    46,
    46,
    46,
    34,
    44,
    34,
    102,
    114,
    111,
    109,
    73,
    110,
    100,
    101,
    120,
    34,
    58,
    49,
    44,
    34,
    116,
    111,
    73,
    110,
    100,
    101,
    120,
    34,
    58,
    49,
    48,
    49,
    44,
    34,
    102,
    114,
    111,
    109,
    72,
    97,
    115,
    104,
    34,
    58,
    34,
    48,
    120,
    46,
    46,
    46,
    34,
    44,
    34,
    116,
    111,
    72,
    97,
    115,
    104,
    34,
    58,
    34,
    48,
    120,
    46,
    46,
    46,
    34,
    44,
    34,
    109,
    115,
    103,
    84,
    121,
    112,
    101,
    34,
    58,
    34,
    83,
    89,
    78,
    67,
    95,
    83,
    84,
    65,
    84,
    69,
    95,
    82,
    69,
    81,
    34,
    125
  ];

  syncMsgs.MsgBuilder.stateRequestMessage(state_sync_req_obj, (err, msg) => {
    if (err) {
      assert.strictEqual(false, true, err);
    } else {
      let network = msg.toNetwork();
      assert.strictEqual(shouldBeNetwork.length, network.length, "error length in network parsing");
      let error = shouldBeNetwork.some(v1 => {
        return !network.includes(v1);
      });
      assert.strictEqual(false, error, "some bytes not equal ");
    }
    done();
  });
});

it("should test from network parsing of state sync res msg ", function(done) {
  let fromNetwork = [
    217,
    200,
    123,
    34,
    99,
    111,
    110,
    116,
    114,
    97,
    99,
    116,
    65,
    100,
    100,
    114,
    101,
    115,
    115,
    34,
    58,
    34,
    48,
    120,
    46,
    46,
    46,
    34,
    44,
    34,
    115,
    116,
    97,
    116,
    101,
    115,
    34,
    58,
    91,
    123,
    34,
    105,
    110,
    100,
    101,
    120,
    34,
    58,
    52,
    44,
    34,
    104,
    97,
    115,
    104,
    34,
    58,
    34,
    48,
    120,
    49,
    34,
    44,
    34,
    100,
    97,
    116,
    97,
    34,
    58,
    91,
    49,
    49,
    44,
    49,
    50,
    44,
    49,
    51,
    93,
    125,
    44,
    123,
    34,
    105,
    110,
    100,
    101,
    120,
    34,
    58,
    50,
    44,
    34,
    104,
    97,
    115,
    104,
    34,
    58,
    34,
    48,
    120,
    50,
    34,
    44,
    34,
    100,
    97,
    116,
    97,
    34,
    58,
    91,
    51,
    49,
    49,
    44,
    49,
    50,
    50,
    44,
    49,
    51,
    51,
    93,
    125,
    44,
    123,
    34,
    105,
    110,
    100,
    101,
    120,
    34,
    58,
    51,
    44,
    34,
    104,
    97,
    115,
    104,
    34,
    58,
    34,
    48,
    120,
    51,
    34,
    44,
    34,
    100,
    97,
    116,
    97,
    34,
    58,
    91,
    49,
    53,
    49,
    44,
    49,
    53,
    50,
    44,
    49,
    52,
    51,
    93,
    125,
    93,
    44,
    34,
    109,
    115,
    103,
    84,
    121,
    112,
    101,
    34,
    58,
    34,
    83,
    89,
    78,
    67,
    95,
    83,
    84,
    65,
    84,
    69,
    95,
    82,
    69,
    83,
    34,
    125
  ];

  let state_sync_res_obj = {
    contractAddress: "0x...",
    states: [
      { index: 4, hash: "0x1", data: [11, 12, 13] },
      { index: 2, hash: "0x2", data: [311, 122, 133] },
      { index: 3, hash: "0x3", data: [151, 152, 143] }
    ]
  };

  syncMsgs.MsgBuilder.stateResponseMessage(fromNetwork, (err, msg) => {
    if (err) {
      assert.strictEqual(false, true, err);
    } else {
      let compStates = state_sync_res_obj.states;

      let error = msg.states().some(state => {
        let unEqual = true;
        compStates.forEach(s => {
          if (s.index === state.index) {
            unEqual = false;
          }
        });
        return unEqual;
      });

      assert.strictEqual(false, error, "some bytes not equal ");
    }
    done();
  });
});
*/
