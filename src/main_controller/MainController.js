/**
 * The Runtime Manager:
 * -    Manages all the the different Runtimes.
 * -    Event Manager
 * -    Subscribes to all of the Runtimes
 * -    Propagates Requests between them upon some event.
 * -    Each event is a Trigger to some Action, that's all.
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

class MainController{

    constructor(runtimes){
      // each runtime has {settings,runtime, priority}
      this._runtimes = runtimes;
      // actions
      this._actions = {};
    }
    start(){
      return new Promise(async (resolve,reject)=>{
          // sort 1..n by, 1 will run first , n will run last
          this._runtimes.sort((a,b)=>{
            return a.priority - b.priority;
          });
          // start each runtime in order
          for(let i=0;i<this._runtimes.length;++i){
            let runtime = this._runtimes[i].runtime;
            let settings = this._runtimes[i].settings;
            await runtime.start(settings);
          }
          resolve();
      });
    }
    _subscribeToRuntimes(){
      this._runtimes.forEach(rt=>{
          
      });
    }
}













