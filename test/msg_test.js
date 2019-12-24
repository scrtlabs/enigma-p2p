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
