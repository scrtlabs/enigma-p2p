const DbUtils = require('../../../common/DbUtils');
const constants = require('../../../common/constants');
const MSG_TYPES = constants.P2P_MESSAGES;


class StateSyncReqVerifier {
  verify(remoteMissingStates, syncMessage, callback) {
    //TODO:: lena, here you should hash each delta/byte code received and compare
    //TODO:: lena, to the missing states from previous, if math return true else false.
    //TODO:: lena, here you should pass the ethereum states from remote to use them as the ground truth
    return callback(true);
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
          res = false;
          break;
        }
        if (!(index in remoteMissingStates[address])) {
          // TODO:: lena : error handling
          res = false;
          break;
        }
        if (remoteMissingStates[address][index] != DbUtils.kecckak256Hash(data)) {
          // TODO:: lena : error handling
          res = false;
          break;
        }
      }
    } else {
      if (msgType === MSG_TYPES.SYNC_STATE_RES) {
        const address = syncMessage.address();
        const bytecode = syncMessage.bytecode();
        if (!(address in remoteMissingStates)) {
          // TODO:: lena : error handling
          res = false;
        }
        if (!('bytecode' in remoteMissingStates[address])) {
          // TODO:: lena : error handling
          res = false;
        }
        if (remoteMissingStates[address].bytecode != bytecode) {
          // TODO:: lena : error handling
          res = false;
        }
      } else {
        // TODO:: lena : error handling
        res = false;
      }
    }
    callback(res);
  }
}
module.exports = StateSyncReqVerifier;
