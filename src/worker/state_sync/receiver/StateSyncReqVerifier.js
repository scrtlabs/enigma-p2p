const DbUtils = require('../../../common/DbUtils');
const constants = require('../../../common/constants');
const MSG_TYPES = constants.P2P_MESSAGES;


class StateSyncReqVerifier {
  verify(remoteMissingStates, syncMessage, callback) {
    let res = true;

    const msgType = syncMessage.type();

    if (msgType === MSG_TYPES.SYNC_STATE_RES) {
      const deltas = syncMessage.deltas();
      for (let i = 0; i < deltas.length; i++) {
        const address = deltas[i].address;
        const data = deltas[i].data;
        const index = deltas[i].key;
        if (!(address in remoteMissingStates)) {
          // TODO:: lena : error handling
          //console.log("mismatch with address %s %s", address, remoteMissingStates);
          res = false;
          break;
        }
        if (!(index in remoteMissingStates[address].deltas)) {
          // TODO:: lena : error handling
          //console.log("mismatch with index %s %s %s", index, address, JSON.stringify(remoteMissingStates[address].deltas));
          res = false;
          break;
        }
        if (remoteMissingStates[address].deltas[index] != DbUtils.kecckak256Hash(data)) {
          // TODO:: lena : error handling
          //console.log("mismatch with delta %s %s", DbUtils.kecckak256Hash(data), remoteMissingStates[address].deltas[index]);
          res = false;
          break;
        }
      }
    } else {
      if (msgType === MSG_TYPES.SYNC_BCODE_RES) {
        const address = syncMessage.address();
        const bytecodeHash = DbUtils.kecckak256Hash(syncMessage.bytecode());
        if (!(address in remoteMissingStates)) {
          // TODO:: lena : error handling
          //console.log("mismatch with address %s %s", address, remoteMissingStates);
          res = false;
        }
        if (!('bytecode' in remoteMissingStates[address])) {
          // TODO:: lena : error handling
          //console.log("no bytecode %s", remoteMissingStates[address]);
          res = false;
        }
        if (remoteMissingStates[address].bytecode != bytecodeHash) {
          // TODO:: lena : error handling
          //console.log("mismatch with bytecode hash %s %s", bytecodeHash, remoteMissingStates[address].bytecode);
          res = false;
        }
      } else {
        // TODO:: lena : error handling
        //console.log("wrong msg type %s", msgType);
        res = false;
      }
    }
    callback(res);
  }
}
module.exports = StateSyncReqVerifier;
