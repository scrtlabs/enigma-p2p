# On boarding plan 

To contribute to the project some prerequisites are required. 
Below is a suggested plan for beginners. 

# Programming

## Design Patterns 

- Very good background for understanding some of the design decisions in [Architechtural Patterns](https://towardsdatascience.com/10-common-software-architectural-patterns-in-a-nutshell-a0b47a1e9013?gi=871cda17e27f)
- [Observer Pattern](https://en.wikipedia.org/wiki/Observer_pattern) will cover the concept of [EventEmitters](#EventEmitter) and Actions in the project.
- The `Actions` in the project are heavily inspired by the [Command Pattern](https://en.wikipedia.org/wiki/Command_pattern)
- [Builder Pattern](https://en.wikipedia.org/wiki/Builder_pattern) and [Fluent Programming](https://en.wikipedia.org/wiki/Fluent_interface) are used widely to create stuff.

## Node JS 

### Javascript

**Goal:** focus on syntax, core functionality and NOT on the browser.
- [Javascript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [JSON object](https://www.w3schools.com/js/js_json.asp)
- [The Modern Javascript Tutorial](https://javascript.info/)
- [Interactive JS coding challenges](https://www.codewars.com/?language=javascript)

### NodeJS platform

- [NodeJS documentation](https://nodejs.org/dist/latest-v10.x/docs/api/)
- [Youtube](https://www.youtube.com/watch?v=TlB_eWDSMt4)
- [Javascript vs NodeJS](https://www.educba.com/javascript-vs-node-js/)

### NPM 

 - [What is NPM](https://www.w3schools.com/nodejs/nodejs_npm.asp)
 - [Understanding NPM](https://hackernoon.com/understanding-npm-in-nodejs-fca157586c98)
 - [NPM](https://www.npmjs.com/)

### Callbacks 

 - [Introduction: callbacks](https://javascript.info/callbacks)
 
### EventEmitter

 - [Official docs](https://nodejs.org/api/events.html)
 - [Tutorial](https://appdividend.com/2017/10/16/node-js-events-eventemitter-tutorial-example-scratch/)
 
### Promise and Async 

 - [Writting neat async code in JS](https://medium.com/dev-bits/writing-neat-asynchronous-node-js-code-with-promises-32ed3a4fd098)
 - [Async/Await](https://javascript.info/async-await)
 - [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
 - [utils.promisify](https://nodejs.org/dist/latest-v8.x/docs/api/util.html)


### Async NPM module

Very important module.

- [async](https://caolan.github.io/async/docs.html)

### Pull streams module

Very important module.

- [pull-stream](https://www.npmjs.com/package/pull-stream)

### Exercises

The following exercises will require registering a free account and generating an API KEY from [etherscan.io](https://etherscan.io/apis) 
Once you have signed in, generate an API key.
This might be a valid API-KEY `6W8CIWBAWXKPG3653117TYHZU4WG8BTHAX`

### Exercise 1 

**Description:**

Given a command line argument representing an `Ethereum Account Address` and `output destination`,
fetch the [Ethereum Price and total supply](https://etherscan.io/apis#stats) and the [Ethereum Balance](https://etherscan.io/apis#accounts). Save the result into a JSON file.

**Input:**

Command line: 
- Ethereum Account address
- Output file destination 
  
**Output:**

Save into the output file an object as follows: 
```json
{
    "lastPrice" : <price>,
    "totalSupply" : <totalSupply>,
    "account" : {
        "address" : <address>, 
        "balance: <balance>, 
    }

}
```

### Exercise 2 

**Description:**

Same thing as `Exercise 1` only this time it is a list of Ethereum addresses. 
For balances only the [Get Ether Balance for a single Address](https://etherscan.io/apis#accounts) endpoint is allowed.

**Do not use `Get Ether Balance for multiple Addresses in a single call
` endoint.**


**Input:**

Command line: 
- List of Ethereum Account addresses seperated by commas
- Output file destination 
  
expected usage example: 

`node exercise2.js --addrs 0x1,0x2,0x3 --out result.json`

**Output:**

Save into the output file an object as follows: 
```json
{
    "lastPrice" : <price>,
    "totalSupply" : <totalSupply>,
    "accounts" : [
        {
            "address" : <address>, 
            "balance: <balance>, 
        },...
    ]

}
```

hint: use [async parallel](https://github.com/enigmampc/enigma-p2p/blob/23dd6cddeb44ee162bccd10991ee802a2f0c4e7f/src/worker/state_sync/provider/Provider.js#L4).



### Exercise 3 
 
Implement `Exercise 2` with **Promises instead of callbacks**

hint: [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)

# Ethereum 

 - [Wiki](https://github.com/ethereum/wiki/wiki)

## Solidity / Smart contracts

**The goal**:  understand how to work with the Enigma smart contract.

 - [Youtube](https://www.youtube.com/watch?v=v_hU0jPtLto)
 - [Docs](https://solidity.readthedocs.io/en/v0.4.24/)

## Truffle 

 - [Truffle Website](https://truffleframework.com/)
 
## Web3 
 - [JsonRpc](https://www.jsonrpc.org/specification)
 - [Ethereum JsonRpc](https://github.com/ethereum/wiki/wiki/JSON-RPC)
 - [Web3 JS API](https://web3js.readthedocs.io/en/1.0/)
  
# Networking 

## General Concepts 

 - [Kademlia DHT](https://en.wikipedia.org/wiki/Kademlia)
 - [Bitcoin P2P](https://bitcoin.org/en/developer-guide#p2p-network)
 - [Ethereum P2P](https://github.com/ethereum/devp2p)

## Libp2p 

  - [Specs](https://github.com/libp2p/specs) 
  - [Libp2p JS](https://github.com/libp2p/js-libp2p)
  - **MOST IMPORTANT**: [Examples](https://github.com/libp2p/js-libp2p/tree/master/examples)

### Exercise 1 
  1. Run and understand the [Echo](https://github.com/libp2p/js-libp2p/tree/master/examples/echo) example.
  2. Modify the example in such a way that: 
     1. The Listener doesn't simply echo the message but returns `<date> + dialer msg` echo. 
        for example: the dialer sends "hi!" the listener returns `2019-03-25T08:57:33.235Z hi!`.
     2. The `dialer` input should come from stdin 
     3. The input from #2 should be an infinite loop until user closes the terminal.
     

### Exercise 2


Build a decentralized chat with no private messages, only group messages based on [pubsub](https://github.com/libp2p/js-libp2p/tree/master/examples/pubsub)

**example:**

nickname: user1 topics: enigma, reddit, facebook 
nickname: user2 topics: enigma, world news 
nickname: user3 topics: enigma, reddit, facebook 

- every message posted to `enigma` topic will be seen by all 3 users.
- user2 is the only one subscribed to `world news` and can post and read there 
- if user3 posts a message to `facebook` topic user1 will receive it. 
