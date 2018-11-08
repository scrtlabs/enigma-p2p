const Communicator = require('./Communicator');

class Channel {
  /**
   * Creates a bi-directional channel
   * OnMsg1 and 2 are either both null or both exist
   * @param {Function} onMsg1 - optinal (envelop)=>{}
   * @param {Function} onMsg2 - optional (envelop)=>{}
   * @return {Object} {channel1, channel2}
   * */
  static biDirectChannel(onMsg1, onMsg2) {
    const c1 = new Communicator();
    const c2 = new Communicator(c1);
    c1._setCommunicator(c2);

    // set the callbacks immediatly -> safer
    if (onMsg1 && onMsg2) {
      c1.setOnMessage(onMsg1);
      c2.setOnMessage(onMsg2);
    }
    return {channel1: c1, channel2: c2};
  }
}


module.exports = Channel;
