/**
 * The Runtime Manager:
 * -    Manages all the the different Runtimes.
 * -    Event Manager
 * -    Subscribes to all of the Runtimes
 * -    Propagates Requests between them upon some event.
 * -    Each event is a Trigger to some Action, that's all.
 * -    Every runtime must implement 2 functions:
 * -      setChannel(communicator), communicator is a part of channel that speaks to the Runtime Manager
 * -      type():String, returns the type of the runtime so the communicators can be mapped.
 * -
 * Runtimes:
 * -    CLI
 * -    Core
 * -    Node
 * -    Ethereum
 * -    JsonRpcAPI
 * The CLI Runtime:
 * -   Asynchronous commands from a user client
 * -   A User will start the control flow
 * -   Set of definitions is required
 * The Core Runtime:
 * -   Asynchronous Inter-Process Communication
 * -   Relays messages between Core & the enigma-p2p software
 * -   Based on ZeroMQ Response-Request model, Core is the Responder and enigma-p2p is the Requester
 * -   Takes requests from the p2p, sends them to Core
 * -   Has a known format of defined Req/Res messages
 * The Node Runtime:
 * -   Asynchronous Controller that manages the P2P networking stuff
 * -   Highly coupled to the protocol specifics
 * -   Has a set of components that are responsible for different things such as:
 * -    -   Managing Connections
 * -    -   Sending/Receiving States
 * The Ethereum Runtime:
 * -    Asynchronous Controller that writes and reads data from Ethereum.
 * -    The interface to the Enigma.sol contract.
 * -    Manages Worker registration, state validation, task commitments and more.
 * The JsonRpcApi:
 * -    Asynchronous Server that responds to user requests (dApp)
 * -    Based on JsonRpc server and a remote Client
 * -    secret contract users will query the workers via this API
 */

const Channel = require('./channels/Channel');
const constants = require('../common/constants');
const DummyAction = require('./actions/DummyAction');
const DbAction = require('./actions/DbAction');
const ProxyAction = require('./actions/ProxyAction');
class MainController {
  constructor(runtimes) {
    let notifications = constants.MAIN_CONTROLLER_NOTIFICATIONS;
    this._runtimes = runtimes;
    // actions
    this._actions = {
      'dummy': new DummyAction(this),
      [notifications.Proxy] : new ProxyAction(this),
      [notifications.DbRequest] : new DbAction(this),
    };
    // runtime communicators
    this._communicators = {};
  }
  getCommunicator(type) {
    return this._communicators[type];
  }
  /**
   * Stop the PROGRAM completely.
   * */
  async stopAll(){
    // //TODO:: add stop all Runtimes
    // let jobs = [];
    // this._runtimes.forEach(rt=>{
    //   let communicator = this._communicators[rt.type()].thisCommunicator;
    //   jobs.push((cb)=>{
    //     communicator.sendAndReceive(new Envelop())
    //         .then(resEnv=>{
    //           cb(null,resEnv);
    //     });
    //   });
    // });
    //
  }
  start() {
    // start each runtime in order
    this._runtimes.forEach((runtime)=>{
      // setup a channel
      const channels = Channel.biDirectChannel();
      const thisCommunicator = channels.channel1;
      const rtCommunicatior = channels.channel2;
      // save the communicator
      this._communicators[runtime.type()] = {rtCommunicator : rtCommunicatior , thisCommunicator : thisCommunicator};
      // dispatch the other side of the channel
      runtime.setChannel(rtCommunicatior);
      // set a response method
      thisCommunicator.setOnMessage((envelop)=>{
        const action = this._actions[envelop.type()];
        if (action) {
          action.execute(thisCommunicator, envelop);
        }
      });
    });
  }
}

module.exports = MainController;

/** mini test */
// async function test(){
//
//   let runtime = new DummyRuntime();
//   let controller = new MainController([runtime]);
//   controller.start();
//   runtime.sendMsg({"req" : "wassup?"});
//
// }





