const crypto = require('../../../common/cryptography');
const constants = require('../../../common/constants');
const MSG_TYPES = constants.P2P_MESSAGES;


class StateSyncReqVerifier {
  /**
   * Verifies the syncMessage contents with the remoteMissingStates that was requested from Ethereum
   * @param {JSON} remoteMissingStates {address : {deltas: {index: deltaHash}, bytecodeHash: hash}}
   * @param {SyncMsg} syncMessage
   * @param {Function} callback (err, isOk)=>{} - isOk is a flag indicating whether the syncMessage is corresponding to the missing information
   * */
  static verify(remoteMissingStates, syncMessage, callback) {
    let res = true;
    let err = null;

    const msgType = syncMessage.type();

    if (msgType === MSG_TYPES.SYNC_STATE_RES) {
      const deltas = syncMessage.deltas();
      for (let i = 0; i < deltas.length; i++) {
        const address = deltas[i].address;
        const data = deltas[i].data;
        const index = deltas[i].key;
        if (!(address in remoteMissingStates)) {
          err = 'received an unknown address ' + address + ' in SyncStateRes';
          res = false;
          break;
        }
        if (!(index in remoteMissingStates[address].deltas)) {
          err = 'received an unknown index ' + index + ' for address ' + address;
          res = false;
          break;
        }
        if (remoteMissingStates[address].deltas[index] != crypto.hash(data)) {
          err = 'delta received for address ' + address + ' in index ' + index + ' does not match remote hash';
          res = false;
          break;
        }
      }
    } else {
      if (msgType === MSG_TYPES.SYNC_BCODE_RES) {
        const address = syncMessage.address();
        const bytecodeHash = crypto.hash(syncMessage.bytecode());
        if (!(address in remoteMissingStates)) {
          err = 'received an unknown address ' + address + ' in SyncBcodeRes';
          res = false;
        } else if (!('bytecodeHash' in remoteMissingStates[address])) {
          err = 'received a bytecodeHash for unknown address ' + address;
          res = false;
        } else if (remoteMissingStates[address].bytecodeHash != bytecodeHash) {
          err = 'bytecodeHash received for address ' + address + ' does not match remote hash';
          res = false;
        }
      } else {
        err = 'received an unknown msgType ' + msgType;
        res = false;
      }
    }
    callback(err, res);
  }
}
module.exports = StateSyncReqVerifier;
