# Enigma-P2P

| Branch  | Build                                                                                                                        | Code Coverage                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Master  | [![Build Status](https://travis-ci.org/enigmampc/enigma-p2p.svg?branch=master)](https://travis-ci.org/enigmampc/enigma-p2p)  | [![codecov](https://codecov.io/gh/enigmampc/enigma-p2p/branch/master/graph/badge.svg?token=SSyRKy7Ckg)](https://codecov.io/gh/enigmampc/enigma-p2p)  |
| Develop | [![Build Status](https://travis-ci.org/enigmampc/enigma-p2p.svg?branch=develop)](https://travis-ci.org/enigmampc/enigma-p2p) | [![codecov](https://codecov.io/gh/enigmampc/enigma-p2p/branch/develop/graph/badge.svg?token=SSyRKy7Ckg)](https://codecov.io/gh/enigmampc/enigma-p2p) |

This is the implementation of the Enigma Worker P2P package written in Node.js and based on [libp2p-js](https://github.com/libp2p/js-libp2p). The Enigma P2P is a part of the Node stack running as a process on the OS communicating both with `Core` and the outside world.

# Table of Contents

- [Enigma-p2p](#Enigma-P2P)
- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
  - [Quick CLI](#quick-cli)
- [Architecture](#architecture)
  - [Core P2P and the outside world](#core-p2p-and-the-outside-world)
  - [P2P High level design](#p2p-high-level-design)
  - [NodeController and internals](#nodecontroller-and-internals)
  - [General concepts](#general-concepts)
    - [Event driven and notifications](#event-driven-and-notifications)
    - [Command pattern and Actions](#command-pattern-and-actions)
    - [Controllers](#controllers)
    - [Constants](#constants)
  - [Runtimes and the main controller](#runtimes-and-the-main-controller)
    - [Main controller](#main-controller)
    - [Runtimes](#runtimes)
    - [Channels and Communicators](#channels-and-communicators)
    - [Api controller](#api-controller)
    - [Creating main controller instance](#creating-main-controller-instance)
  - [The Worker - everything libp2p.](#the-worker---everything-libp2p)
    - [Libp2p configuration](#libp2p-configuration)
    - [EnigmaNode](#enigmanode)
    - [P2P Messages](#p2p-messages)
    - [Incoming requests](#incoming-requests)
    - [State synchronization](#state-synchronization)
    - [PubSub - how to "broadcast"](#pubsub---how-to-%22broadcast%22)
    - [Connecting it all - controller](#connecting-it-all---controller)
    - [creating NodeController instance](#creating-nodecontroller-instance)
  - [Installing](#installing)
- [Running the tests](#running-the-tests)
- [How it works](#how-it-works)
  - [Overview on start](#overview-on-start)
  - [Syncing a Worker](#syncing-a-worker)
    - [Consensus](#consensus)
    - [Content Routing](#content-routing)
    - [Database](#database)
    - [Provide Content](#provide-content)
    - [Find Content](#find-content)
    - [Find Content Providers](#find-content-providers)
    - [Synchronize Content](#synchronize-content)
  - [JSON RPC API](#json-rpc-api)
  - [Built With](#built-with)
  - [Authors](#authors)
  - [License](#license)

# Getting Started

## Quick CLI

First enter the relevant directory:

`cd ./src/cli`

For help type:

`$node cli_app.js -h`

For interactive-options help type `help` while running.

For a quick launch of one bootstrap node type:

`node cli_app.js -i B1 -p B1 --core <ip>:<port> --proxy <port> --mock-core --random-db`

For a quick launch of a regular worker node that will connect to the bootstrap (just launched) in a different terminal type:

`node cli_app.js -b B1 --core <ip>:<port> --proxy <port> --mock-core --random-db`

In this short example we used the following options and flags:


`--core <ip>:<port>` enigma-core uri. In this example we used a core simulation

`--mock-core` launch a core simulation

`--proxy <port>` start up the JSON-RPC server

`--random-db` generate a temporary database for the task management during testing

`-b` specifies the bootstrap node to connect to, `B1` is hard-coded for testing

`-i` load specific node id from a hardcoded path.

`-p` run on a specific port since the bootstrap node is the first node everyone will connect to

# Architecture

## Core P2P and the outside world

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/overview1.jpg"
     alt="Implementation 1" />

## P2P High level design

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/MainController.jpg"
     alt="Implementation 2" />

- The components `NodeController`, `JsonRpcServer`, `CoreRuntime` are essentially autonomous "runtimes".
- The MainController relays the communication with different Actions.
- The communication is done via Channels, which are bi-directional message-sending implementations.

## NodeController and internals

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/NodeControllerDiagrams.jpg"
     alt="Implementation 1" />

## General concepts

The enigma-p2p is asynchronous in its nature and has different concepts that are applied in the architecture.

### Event driven and notifications

Everything is based on notifications and responses to those notifications.
Notifications in the project come in two forms:

1. [EventEmitter](https://nodejs.org/api/events.html#events_events)
   - Are used inside [Worker](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/worker) often. This is how the components communicate with the [NodeController](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/controller/NodeController.js#L124).
2. Channels and communicators

   -Explained later in the `Main Controller` section, used for `request/response` type of communication unlike `EventEmitter` where it is stateless.

### Command pattern and Actions

Since everything is Event driven it means that we want to trigger different things once some event occurs. The design here is based on classic [Command Pattern](https://en.wikipedia.org/wiki/Command_pattern) but with modifications to fit NodeJS style.
Terminology wise, it's called **Actions**.
Everywhere in the project `notifications` lead to `Actions`.
The rational here is that objects hold the **concrete implementation** and Actions are the **operational logic**.

Actions are everywhere:

- [Worker](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/worker/controller/actions)
- [MainController](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/main_controller/actions)
- [CoreRuntime](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/core/actions)

Actions must implement `execute(params)` function and usually take `context` object in their constructor.

To summarize, `Actions` are holding the **operational logic** when to call functions, in which order and it separates the `invocation` from the `execution`.

**Pipelines**

Sometimes different functions needs to be called together, those are called `PipelineAction` and they will be only responsible for calling the other Actions and parsing input/output between them. [Example ReceiveAllPipelineAction](https://github.com/enigmampc/enigma-p2p/blob/mexico_branch/src/worker/controller/actions/sync/ReceiveAllPipelineAction.js).

### Controllers

There are a lot of components that need to talk to each other.
So there is a hierarchy. The controllers are mapping `notifications` that are emitted to `Actions` that need to be executed.

For example, the [NodeController](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/worker/controller).

**!!! Every controller also exposes a [FACADE](https://en.wikipedia.org/wiki/Facade_pattern) to the other things in the project. !!!**

This is how user can call direct `Actions` such as `connect to peers` etc.

### Constants

All the constants go [here](https://github.com/enigmampc/enigma-p2p/blob/mexico_branch/src/common/constants.js).

## Runtimes and the main controller

Each component such as the Worker, CoreRuntime, etc are `Runtimes` and there is a main controller that connects between them.

The reasoning here is again, separation of concerns.

### Main controller

The [MainController](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/main_controller/MainController.js#L1), documented in a comment, is also based on `Actions` with slightly different concepts.

### Runtimes

The different Runtimes need to implement two methods:

`type() : string`

This method returns the Runtime [name](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/common/constants.js#L97).

`setChannel(Communicator)`

This method sets the communicator for each Runtime to talk with the MainController ([example](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/controller/NodeController.js#L208)).

### Channels and Communicators

Runtime communication is usually `request/response`, which is why simple `EventEmitter` is not enough.

For example, when `Worker` component needs something from the DB, it will use a `Channel` and wait for a response.

The [Channel](https://github.com/enigmampc/enigma-p2p/blob/mexico_branch/src/main_controller/channels/Channel.js) class is responsible for creating two [Communicator](https://github.com/enigmampc/enigma-p2p/blob/mexico_branch/src/main_controller/channels/Communicator.js) instances.
The message types between two Communicators are of type [Envelop](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/main_controller/channels/Envelop.js#L3) class.

The "big" innovation here is the `sendAndReceive(envelop)` method.

example:

```javascript
const Envelop = require("./Envelop");
let communicators = Channel.biDirectChannel();
let c1 = communicators.channel1;
let c2 = communicators.channel2;

c1.setOnMessage(envelop => {
  console.log(envelop);
  let e = new Envelop(envelop.id(), { msg: "this is lena " }, "target runtime action");
  c1.send(e);
});
// envelop
let e1 = new Envelop(true, { msg: "who is it? " }, "target runtime action");

let responseEnvelop = await c2.sendAndReceive(e1);
console.log("response: " + responseEnvelop);
```

### Api controller

The MainController exposes a [FACADE](https://en.wikipedia.org/wiki/Facade_pattern) to all the Runtimes.
This is what the **CLI is talking to**.

**TODO::**

The Facade is implemented in [FacadeController](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/main_controller/FacadeController.js#L12) and should be adding [concrete methods](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/main_controller/FacadeController.js#L10) there that will define the general API, currently this is very unstable which is why the CLI calls the [components directly](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/cli/cli_app.js#L196).

### Creating main controller instance

There is a [Builder](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/main_controller/EnvironmentBuilder.js#L9) :-)

[Example](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/cli/cli_app.js#L180) of how the CLI uses the builder to create an instance.

## The Worker - everything libp2p.

The worker runtime is everything that relates to messaging and the p2p.

### Libp2p configuration

Besides the configuration in common/constants.js there are specific libp2p configurations, such as [PeerBundle](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/libp2p-bundle.js#L12).

### EnigmaNode

The [EnigmaNode](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/EnigmaNode.js#L20) is a wrapper to the `PeerBundle` from above. It implements specific p2p functions for enigma. Nothing should talk directly to the `PeerBundle`. Everything low-level that requires `PeerBundle` directly should go through this class instead.

Just to emphasize: if one needs some specific function for libp2p-dht that does not exist yet in the `EnigmaNode` class, it should be implemented here and wrapped.

### P2P Messages

The messages are used as [concrete classes](https://github.com/enigmampc/enigma-p2p/tree/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/policy/p2p_messages). They are documented [here](https://github.com/enigmampc/enigma-p2p/tree/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/docs) alongside with `IPC_MESSAGES.md`. There might be minor differences between what is documented and what is implemented.

### Incoming requests

All the inbound messages get accepted by the [ProtocolHandler](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/handlers/ProtcolHandler.js#L18) class.
Building on top of libp2p terminology, different messages are different protocols and each one gets its own [handler](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/handlers/ProtcolHandler.js#L42).

### State synchronization

**Receiver**

A [class](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/state_sync/receiver/Receiver.js#L13) that responsible for the content receiving logic.

**Provider**

A [class](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/state_sync/provider/Provider.js#L9) that responsible for the content providing logic.

**Related Actions**

The [Actions](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/worker/controller/actions/sync) with the operational logic inside `NodeController`.

### PubSub - how to "broadcast"

This is a great way of communicating with nodes in the network using the DHT. Essentially this is a `Multicast` based on `publish/subscribe` architecture.

Nodes can subscribe to different topics and publish messages to those topics.

An [example](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/controller/NodeController.js#L298) (`$broadcast <msg>` in the cli) of publishing to `broadcast` topic.

Subscribe [example](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/EnigmaNode.js#L199) and the [handler](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/handlers/ProtcolHandler.js#L92) for a message.

**This functionality is great for the JSON-RPC api to propagate messages to the network from a proxy node the dApp user is connected to**.

### Connecting it all - controller

There are more things in [Worker](https://github.com/enigmampc/enigma-p2p/tree/mexico_branch/src/worker) and all of them are managed by the [NodeController](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/controller/NodeController.js#L43) that maps `notifications` to `Actions`.

**The NodeController exposes the Facade API for the Worker p2p things**

### creating NodeController instance

`initDefaultTemplate(options,logger)` is for creating a new [instance](https://github.com/enigmampc/enigma-p2p/blob/6dddeb5e1e3f7d20e0c9c647be8bad7140bc1285/src/worker/controller/NodeController.js#L102).

## Installing

For using the released version (corresponding to the `main` branch of this repository) download it from npm:

`npm i enigma-p2p`

For installing a different branch of the repository:

`git clone` this repository

### If running with Docker

cd into the project directory and type:

`docker build .`

To run later, save the final build hash or give it a name.

To run the node inside a container from the project directory type:

```
 docker run -v "$PWD":/usr/src/app -ti --net="host" <image-build-id> /bin/bash
```

## Installing globally with nvm

1. install `nvm`
2. install some node version : `$nvm install 10.16`
3. type `npm install -g enigma-p2p`
4. to run global type : `enigma-p2p-test <flags>`

Incase of missing modules such as `connect` and `tempdir` install them in the same way.

`npm install -g <missing module name>`

# Running the tests

```bash
git clone git@github.com:enigmampc/enigma-p2p.git
cd enigma-p2p
npm install
npm run test
```

## Troubleshooting

If while running the tests you receive an `Address already in use` error, try running `sudo netstat -ltnp` to see which processes on your machine are already using one of the port that was reported as already in use (from `./test/ipc_test.js`).

# How it works

## Overview on start

At a very high level, the Worker needs to execute a sequence of steps
and only then, it can start "working". Here is a diagram explaining all of the initial steps the Worker has to do:

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/start_flow.jpg"
     alt="Implementation 4" />

- Start

Starting the node after Core. Set some configurations such as network settings, Ethereum wallet etc.

- Bootstrap

Connect to hardcoded well-known Bootstrap nodes.

- Sync State

Synchronize the Worker state: Secret contracts bytecode and deltas.

- Announce State

Update the DHT registries with the content available (i.e deltas) for other peers to sync.

- Background Services

Such as Ethereum listener, JsonRpcAPI etc.

- Register

Register with Enigma.sol with all the required steps including Enclave Report.

## Syncing a Worker

Worker synchronization is done using libp2p content routing mechanisms.
The architecture is sharded in its nature.
We could think of **each contract as a chain of blocks**, and **each block** represents some **delta** in a **sequence**.
The first block is the bytecode, then we get delta 0, delta 1 and so on.

The synchronization process consists of many parts and before diving in, here is what it **doesn't do** (some might call it **TODO**):

1. Protect against DOS/DDOS attacks.
2. Blacklist ip.
3. Re-use connection with a peer for more than one contract, i.e the full process of synching contract a and b will re-open the connection twice even if it's the same peer.

What it **does** today:

1. Handles back-pressure (requests are piped in sink-streams with max of 500 range for deltas)
2. Shutdown the stream if something went wrong (i.e corrupted data)
3. Optimized for simple laptops with no hardware/bandwidth assumptions.
4. All the components in the process both the `Receiver`/`Provider` uses `sink-streams` all the way from the `request` to the `database` storage.

Without further due, let's look with the flow.

### Consensus

The Enigma Contract on Ethereum is used as the consensus layer, containing a mapping between:

`Secret-Contract-Address` => `hash(WASM)`,`[hash(delta 0), ...hash(delta n)]`

Synchronizing the State means:

    1) Having all the secret-contracts WASM code.
    2) Having all the state deltas for each secret-contract.

**In the code:**

[worker/IdentifyMissingStaetsAction](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/controller/actions/sync/IdentifyMissingStatesAction.js) uses [StateSync](https://github.com/enigmampc/enigma-p2p/blob/develop/src/ethereum/StateSync.js) to get the `missing states map` it maps between addresses and delta/bytecode hashes that are missing. This is also used in the [verification stream](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/state_sync/receiver/Receiver.js) to validate the correctness of the received data.
In simple words, instead of going to Ethereum twice, once for identifying what is missing and the second time for verification, we reuse the same object.

### Content Routing

The content routing is based on the libp2p implementation of IPFS using [CID](https://github.com/ipld/js-cid) to identify content and Kad-DHT for finding peers.

In the `enigma-p2p` the `CID` is wrapped with [EngCid](https://github.com/enigmampc/enigma-p2p/blob/develop/src/common/EngCID.js) and exposes convenient functions to use for the enigma use-case.

**We use CID only to represent a contract address and nothing else.**

### Database

**The message definitions between `enigma-core` and `enigma-p2p` are defined [here](https://github.com/enigmampc/enigma-p2p/blob/develop/docs/IPC_MESSAGES.md)**

All the information is stored encrypted inside a rocks-db instance on the disk and `enigma-core` takes care of it. The `Read`/`Write` requests to the db are done via [CoreRuntime](https://github.com/enigmampc/enigma-p2p/blob/develop/src/core/CoreRuntime.js) that uses `zeromq` sockets for IPC.

The enigma-p2p itself uses a level-db database for storing tasks - their inputs and result. The [TaskManager](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/tasks/TaskManager.js) component is the one responsible for the tasks management. 

It was also considered to use another database for caching local tips in enigma-p2p (pointers to the local most recent contracts states), however although some work has been done in this direction, this is currently not yet applicable. 

### Provide Content

Providing Content is the process of announcing to the network a list of CID's. **A node announces the content it provides after it's being synchronized with the Enigma Contract on Ethereum**.

Providing requires an announcements process which is done via [AnnounceLocalStateAction](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/controller/actions/sync/AnnounceLocalStateAction.js).

Nodes store in their `DHT` a mapping between `CID` and provider peers.

### Find Content

This is the role of the `Receiver`.
Finding content is the lookup of certains CID's in the network.
Finding content requires two steps:

1. Get the local state.
2. Get the remote state.

The delta between the remote and the local is **what needs to be synched**.

This is a diagram demonstrating the use of the action [IdentifyMissingStatesAction](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/controller/actions/sync/IdentifyMissingStatesAction.js) that will take care of both steps (thanks to @lenak25 implementation of remote states).

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/IdentifySyncDiagram.png"
     alt="identify 2" />

### Find Content Providers

Ok, so we know **what** is missing, now we need to find **who** can provide it. There is a list for each CID since peers might go offline or be malicious etc.

Again, this is from the `Receiver` perspective triggering [ContentProviderAction](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/controller/actions/sync/FindContentProviderAction.js).

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/FindProvidersAction.png"
     alt="find providers 2" />

The end result of this action is a map of `CID`'s to `providers` (peers) that can provide that CID.

**TODO::** optimize on connections, i.e if a peer exists in all of the CID's then reuse the connection.

### Synchronize Content

From the `Receiver` perspective it all starts with [TryReceiveAllAction](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/controller/actions/sync/TryReceiveAllAction.js). At the moment we sync
each contract one-by-one because:

1. It's safer to manage
2. It takes no assumption of good hardware/bandwidth

At the high-level the process of managing the synchronization of **all** the secret contracts:

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/SyncHighLevel.png"
     alt="sync high level" />

Phew, this is not simple. If we go deeper, there can be faults i.e peer go offline, malicious peer, corrupted data etc. So this is the process of receiving **one** secret contract (this is in-depth look into the yellow circle saying `Sync` in the above diagram):

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/TrySyncReceiveOneContract.png"
     alt="sync one " />

It's not over yet, if we look deeper, in the above diagram there is a state that's called `Sync-Receive contract`. This is the actual flow of passing bytes around between two peers:

- [Provider](https://github.com/enigmampc/enigma-p2p/tree/develop/src/worker/state_sync/provider)
- [Receiver](https://github.com/enigmampc/enigma-p2p/blob/develop/src/worker/state_sync/receiver/Receiver.js)

A `Receiver` can request either a bytecode or deltas (limited up to 500 deltas per request). To handle back pressure and DOS attacks each request is handled once the previous is done, i.e the `Receiver` will send another request to the `Provider` only after verifying and storing the current request.

The [messages](https://github.com/enigmampc/enigma-p2p/blob/develop/definitions/states_sync_sequence) can be:

- STATE_SYNC_REQ/RES
- SYNC_BCODE_REQ/RES

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/streams_diagram_sync.png"
     alt="streams flow " />

## JSON RPC API

<img src="https://github.com/enigmampc/enigma-p2p/blob/develop/docs/jsonrpc.png"
     alt="streams flow " />

## Built With

- [NodeJS](https://nodejs.org/en/)
- [Libp2p](https://libp2p.io/) - Networking library

## Authors
- Isan Rivkin
- Lena Kleyner
- Elichai Turkel
- Avishai Weingarten
- Victor Grau Serrat
- Aditya Palepu
- Assaf Morami

## License

The Enigma Worker P2P is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a [copy](LICENSE) of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
