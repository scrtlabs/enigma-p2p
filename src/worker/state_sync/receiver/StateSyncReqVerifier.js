class StateSyncReqVerifier {
  verify(unverified, callback) {
    //TODO:: lena, here you should hash each delta/byte code received and compare
    //TODO:: lena, to the missing states from previous, if math return true else false.
    //TODO:: lena, here you should pass the ethereum states from remote to use them as the ground truth
    callback(true);
  }
}
module.exports = StateSyncReqVerifier;
