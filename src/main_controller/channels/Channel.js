const Communicator = require("./Communicator");

class Channel {
  /**
   * Creates a bi-directional channel
   * @return {Object} {channel1, channel2}
   * */
  static biDirectChannel() {
    const c1 = new Communicator();
    const c2 = new Communicator(c1);
    c1._setCommunicator(c2);
    return { channel1: c1, channel2: c2 };
  }
}

module.exports = Channel;
