# JSON RPC Server

This module implements a [JSON-RPC 2.0](https://www.jsonrpc.org/specification_)-compliant server using the [jayson](https://www.npmjs.com/package/jayson) package.

This module implements the following methods:

## getWorkerEncryptionKey

Requests the public encryption key for the worker node assigned to a given contract for the current epoch. There exists already a function in the Enigma contract that returns the list of selected workers given a secret contract address and a block number (See `getWorkerGroup()` in [Enigma.sol](https://github.com/enigmampc/enigma-contract-internal/blob/master/contracts/Enigma.sol)), so we can pass the workerAddress directly to this request.

**Parameters**

- `workerAddress` (String) - The address for the selected worker
- `userPubKey` (String) - 64 bytes pubkey for Diffie-Hellman

**Returns**

- `workerEncryptionKey` (String) - The requested public encryption key of the worker node
- `workerSig` (String) - The signature of the worker node

**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"getWorkerEncryptionKey", "params": {"workerAddress": "0x627306090abaB3A6e1400e9345bC60c78a8BEf57", "userPubKey": "2ea8e4cefb78efd0725ed12b23b05079a0a433cc8a656f212accf58672fee44a20cfcaa50466237273e762e49ec912be61358d5e90bff56a53a0ed42abfe27e3"}}'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": {
	    "workerEncryptionKey": "0061d93b5412c0c99c3c7867db13c4e13e51292bd52565d002ecf845bb0cfd8adfa5459173364ea8aff3fe24054cca88581f6c3c5e928097b9d4d47fce12ae47",
	    "workerSig": "mySig",
	}
}
```
## deploySecretContract

Deploys a Secret Contract onto the Enigma Network.

**Parameters**

- `workerAddress` (String) - The workers address
- `preCode` (String) - The hash of the compiled bytecode
- `encryptedArgs` (String) - Encrypted RLP-encoded args needed for the secret contract's constructor
- `encryptedFn` (String) -Encypted function that needs to be called
- `userDHKey` (String) - User's public key from Diffie-Hellman
- `contractAddress` (String) - Also serves as taskId, and can be recreated by anyone. H(userAddress, nonce)

**Returns**

`deploySentResult` (Boolean) - Returns `true` if the inputs were broadcasted successfully, otherwise `false`


**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"deploySecretContract", "params": {"preCode": "0xd8bba960831bacafe85a45f6e29d3d3cb7f61180cce79dc41d47ab6a18e195dc...", "encryptedArgs": "3cf8eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9...", "encryptedFn": "0x5a380b9a7f5982f2b9fa69d952064e82cb4b6b9a718d98142da4b83a43d823455d75a35cc3600ba01fe4aa0f1b140006e98106a112e13e6f676d4bccb7c70cdd1c..", "userDHKey" : "...", "contractAddress":"...","workerAddress":"sign-address-of-worker"}}'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": {
	    "deploySentResult": true
	}
}
```

## sendTaskInput

Sends the encrypted inputs for a given Task to the Enigma network for computation.

**Parameters**

- `taskId` (String) - The hash of the function signature, RLP-encoded task args, creation block number, and user public key
- `workerAddress` (String) - The workers address
- `encryptedFn` (String) - Encrypted function signature
- `encryptedArgs` (String) - Encrypted RLP-encoded task args
- `contractAddress` (String) - The requested contract address
- `userDHKey` (String) - User's public key from Diffie-Hellman

**Returns**

`sendTaskResult` - returns `true` if the inputs were received successfully, otherwise `false`

**Example**

```sh
// Request
curl -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id":1, "method":"sendTaskInput", "params": {"taskId": "0xdd839d251b7b16d0f52bb05b0ab4290abe0e44dd0044b2627ec7e5ce21815667", "workerAddress": "0x1232172b65584545221760E3D6668902B076321", "contractAddress": "0x8Fe32172b6648D9BB221760E3DE738902B076099", "encryptedFn": "1a4a67d6ad23c524d99019a3b778fded06185ab9b9f16b4d0ce8e7538d6cb8da5ea032f313baef3272c74ee161ec6f839bfafaf440", "encryptedArgs": "c346fe01a814be2939b77eb99a02017bb2ab2ca02f8e74854b8cae10c926b0082f8dca7f25afd48f53bcda5fc5dfaccf", "userDHKey": "04f542371d69af8ebe7c8a00bdc5a9d9f39969406d6c1396037ede55515845dda69e42145834e631628c628812d85c805e9da1c56415b32cf99d5ae900f1c1565c"}}'

// Result
{
	"jsonrpc":"2.0",
	"id": 1,
	"result": {
	    "sendTaskResult": true
	}
}
```

## getTaskStatus

Queries the node for the status of a given Task identified by its `taskId`. The Enigma.JS library provides in its [enigma-utils.js](https://github.com/enigmampc/enigma-contract-internal/blob/master/enigma-js/src/enigma-utils.js) file a function called `generateTaskId` with the following signature `function generateTaskId(fn, args, scAddr, blockNumber, userPubKey)`, which in turn returns a `taskId` that can be passed as an input to this method.

**Parameters**

`taskId` - Identifier of the Task to check its status

`workerAddress` - target worker address

**Returns**

## **See [TASKS_LIFE_CYCLE_DOCS](../../docs/TASKS_LIFE_CYCLE_DOCS.md) for in depth about statuses**

`STATUS` - One of the following values:
- `0`: TaskId not found
- `1`: TaskId exists, but it has not been verified
- `2`: TaskId exists and it has been verified, in-progress
- `3`: Success
- `4`: Failure

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
