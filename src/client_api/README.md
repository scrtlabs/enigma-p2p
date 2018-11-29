# JSON RPC Server

This module implements a JSON-RPC 2.0 compliant server using the [jayson](https://www.npmjs.com/package/jayson) package.

This module implements the following methods:

## getWorkerEncryptionKey

Requests the public encryption key for the worker node assigned to a given contract for the current epoch. There exists already a function in the Enigma contract that returns the list of selected workers given a secret contract address and a block number (See `getWorkerGroup()` in [Enigma.sol](https://github.com/enigmampc/enigma-contract-internal/blob/master/contracts/Enigma.sol)), so we can pass the workerAddress directly to this request.

**Parameters**

`workerAddress` - The address for the selected worker

**Returns**

- `KEY` - The requested public encryption key of the worker node.
- `SIGNATURE` - The signature of the worker node.

**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"getWorkerEncryptionKey", "params": ["{workerAddress}"]}'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": ['0061d93b5412c0c99c3c7867db13c4e13e51292bd52565d002ecf845bb0cfd8adfa5459173364ea8aff3fe24054cca88581f6c3c5e928097b9d4d47fce12ae47', '{mySig}']);
}
```

## deploySecretContract

Deploys a Secret Contract onto the Enigma Network.

**Parameters**

- `compiledBytecodeHash` - The hash of the compiled bytecode
- `encryptedEncodedArgs` - bytes
- `signature` 

**Returns**

`Boolean` - returns `true` if the inputs were received successfully, otherwise `false`


**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"deploySecretContract", "params": ["{compiledBytecodeHash}", "{encryptedEncodedArgs}", "{signature}"] }'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": true}
}
```

## sendTaskInputs

Sends the encrypted inputs for a given Task to the Enigma network for computation.

**Parameters**

`taskInputs` - Serialized array of the [TaskId object](https://github.com/enigmampc/enigma-contract-internal/blob/adi/next/enigma-js/src/models/TaskInput.js) as returned by the function `serializeTaskInput(taskInput)` from [enigma-utils.js](https://github.com/enigmampc/enigma-contract-internal/blob/adi/next/enigma-js/src/Enigma.js)

**Returns**

`Boolean` - returns `true` if the inputs were received successfully, otherwise `false`

**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"sendTaskInputs", "params": ["{TBD}"] }'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": true}
}
```

## getTaskStatus

Queries the node for the status of a given Task identified by its TaskId. The Enigma.JS library provides in its [enigma-utils.js](https://github.com/enigmampc/enigma-contract-internal/blob/master/enigma-js/src/enigma-utils.js) file a function called `generateTaskId` with the following signature `function generateTaskId(fn, args, scAddr, blockNumber, userPubKey)`, which in turn returns a TaskId that can be passed an input to this method.

**Parameters**

`TASKID` - Identifier of the Task to check status

**Returns**

`STATUS` - One of the following values:
- `0`: TaskId not found
- `1`: TaskId exists, but it has not been verified
- `2`: TaskId exists and it has been verified

**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"getTaskStatus", "params": ["0x9f4d74fc0cfd33501e38684274b65e44315ace570a66fd43315760a0891d5fae"] }'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": 0}
}
```
