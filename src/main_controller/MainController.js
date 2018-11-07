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
 * -   Asynchroneus commands from a user client
 * -   A User will start the control flow
 * -   Set of definitions iis required
 * The Core Runtime:
 * -   Asynchroneus Inter-Process Communication
 * -   Relays messages between Core & The enigma-p2p software
 * -   Based on ZeroMQ Response-Request model, Core is the Responder and enigma-p2p is the Requester
 * -   Takes requests from the p2p, sends them to Core and
 * -   Has a known format of defined Req/Res messages
 * The Node Runtime:
 * -   Asynchroneus Controller that manages the P2P networking stuff
 * -   Highly coupled to the protocol specifics
 * -   Has a set of components that are responsible for different things such as:
 * -    -   Managing Connections
 * -    -   Sending/Recieveg States
 * The Ethereum Runtime:
 * -    Asynchroneus Controller that writes and reads data from Ethereum.
 * -    The interface to the Enigma.sol contract.
 * -    Manages Worker registration, states validatition, task commitments and more.
 * The JsonRpcApi:
 * -    Asynchroneus Server that responds to users requests (dApp)
 * -    Based on JsonRpc server and a remote Client
 * -    secret contract users will query the Workers via this Api
 */

const Channel = require('./channels/Channel');
// dummy
const DummyRuntime = require('./DummyRuntime');
const DummyAction = require('./actions/DummyAction');

class MainController{

    constructor(runtimes){
      this._runtimes = runtimes;
      // actions
      this._actions = {
        'dummy' : new DummyAction(this)
      };
      // runtime communicators
      this._communicators = {};
    }
    getCommunicator(type){
      return this._communicators[type];
    }
    start(){
      // start each runtime in order
      this._runtimes.forEach(runtime=>{
        // setup a channel
        let channels = Channel.biDirectChannel();
        let thisCommunicator = channels.channel1;
        let rtCommunicatior = channels.channel2;
        // save the communicator
        this._communicators[runtime.type()] = rtCommunicatior;
        // dispatch the other side of the channel
        runtime.setChannel(rtCommunicatior);
        // set a response method
        thisCommunicator.setOnMessage((envelop)=>{
          let action = this._actions[envelop.type()];
          if(action){
            action.execute(thisCommunicator,envelop);
          }
        });
      });
    }
}


/** mini test */
async function test(){

  let runtime = new DummyRuntime();
  let controller = new MainController([runtime]);
  controller.start();
  runtime.sendMsg({"req" : "wassup?"});

}



test();




























