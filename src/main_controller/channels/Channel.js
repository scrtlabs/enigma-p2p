const Communicator = require('./Communicator');

class Channel {
  /**
   * Creates a bi-directional channel
   * @return {Object} {channel1, channel2}
   * */
  static biDirectChannel() {
    const c1 = new Communicator();
    const c2 = new Communicator(c1);
    c1._setCommunicator(c2);
    return {channel1: c1, channel2: c2};
  }
}

module.exports = Channel;

// const Envelop = require('./Envelop');
// async function doStuff(){
//   let communicators = Channel.biDirectChannel();
//   let c1 = communicators.channel1;
//   let c2 = communicators.channel2;
//
//   c1.setOnMessage((envelop)=>{
//     console.log(envelop);
//     let e = new Envelop(envelop.id(),{msg : 'this is lena '}, 'later');
//     c1.send(e);
//   });
//   // envelop
//   let e1 = new Envelop(true,{msg : 'who is it? '}, 'later');
//
//   let responseEnvelop = await c2.sendAndReceive(e1);
//   console.log("response: ");
//   console.log(responseEnvelop);
// }
//
// doStuff();

