# Communication type
`enigma-core` and `enigma-p2p` communicate via `zeromq` architechture.
The communication is done with `REQ` and `REP` sockets.
`enigma-p2p` is the `REQ` (requester) and `enigma-core` is the `REP` (responder).

# Message type


## Enclave identity related

### `GetRegistrationParams` message
Request:

```
{
    id : <unique_request_id>,
    type : GetRegistrationParams
}
```
Response:
```
{
    id : <unique_request_id>,
    type : GetRegistrationParams,
    result : {
        signingKey : hex,
        report: hex,
        signature: hex,
    }
}
```

## Enclave Read only Database related

### `GetTip` message
Request:
```
{
    id : <unique_request_id>,
    type : GetTip,
    input : [Secret Contract Address]
}
```
Response:
```
{
   id : <unique_request_id>,
   type : GetTip,
   result : {
       key : [],
       data : []
   }
}
```
### `GetTips` message

Request:
```
{
    id : <unique_request_id>,
    type : GetTips,
    input : [Array<Secret Contract Address>]
}
```
Response:
```
{
    id : <unique_request_id>,
    type : GetTips,
    result : {
        tips : [Array<{address,key,data}>]
    }
}
```
### `GetAllTips` message
Request:
```
{
    id : <unique_request_id>,
    type : GetAllTips
}
```
Response:
```
{
    id : <unique_request_id>,
    type: GetAllTips,
    result : {
        tips : [Array<{address,key,data}>]
    }
}
```
### `GetAllAddrs` message
Request:
```
{
    id : <unique_request_id>,
    type : GetAllAddrs
}
```
Response:
```
{
    id : <unique_request_id>,
    type : GetAllAddrs,
    result : {
        addresses : [Array<Secret contract Addrs>]
    }
}
```
### `GetDelta` message
Request:
```
{
    id : <unique_request_id>,
    type : GetDelta,
    input : [{address, key}]
}
```
Response:
```
{
    id : <unique_request_id>,
    type : GetDelta,
    result : {
        delta : []
    }
}
```
### `GetDeltas` message
Request:
```
{
    id : <unique_request_id>,
    type : GetDeltas,
    input : [{address, from:key, to:key}, ...]
}
```
Response:
```
{
    id : <unique_request_id>,
    type : GetDeltas,
    result : {
        deltas : [{address, key, data},...]
    }
}
```
### `GetContract` message
Request:
```
{
    id : <unique_request_id>,
    type : GetContract,
    input : address
}
```
Response:
```
{
    id : <unique_request_id>,
    type : GetContract,
    result : {
        bytecode : []
    }
}
```

## Enclave Write only Database related

### `UpdateNewContract` message
Request:
```
{
    id : <unique_request_id>,
    type : UpdateNewContract,
    address : ...,
    bytecode : [Secret Contract Address]
}
```
Response:
```
{
    id : <unique_request_id>,
    type : UpdateNewContract,
    address : ...,
    result : {
        status : 0 or err code
    }
}
```

### `UpdateDeltas` message
Request:
```
{
    id : <unique_request_id>,
    type : UpdateDeltas,
    deltas : [{address, key, data : []}, ...]
}
```
Response:
```
{
    id : <unique_request_id>,
    type : UpdateDeltas,
    result : {
        status: 0 or err code,
        errors: [{address,key,status : }, ...]
    }
}
```

## Master Node Key-Exchange related

### `GetPTTRequest` message
Request:
```
{
    id : <unique_request_id>,
    type : GetPTTRequest,
    addresses: [addrress]
}
```

Response:
```
{
    id : <unique_request_id>,
    type : GetPTTRequest,
    result: {
        request: 'the-message-packed-request',
        workerSig: 'the-worker-sig'
    }
}
```
The request is a signed messagepack that looks like this:
```
{
    prefix: b"Enigma Message",
    data: [addresses],
    pubkey: 'DH pubkey',
    id: '12-bytes-msgID',
}
```

### `PTTResponse` message
Request:
```
{
    id : <unique_request_id>,
    type : PTTResponse,
    response: 'the-encrypted-response'
}
```
The response is a signed messagepack that looks like this:
```
{
    prefix: b"Enigma Message",
    data: enc([(address, stateKey)]),
    pubkey: 'DH pubkey',
    id: '12-bytes-msgID',
}
```


Response:
```
{
    id : <unique_request_id>,
    type : GetPTTRequest,
    result: {
        errors: [{address, status}]
    }
}
```

## Computation related

### `NewTaskEncryptionKey` message

The result of the rpc call `GetWorkerEncryptionKey`.

Request:
```
{
    id : <unique_request_id>,
    type : NewTaskEncryptionKey,
    userPubKey: 'the-user-dh-pubkey'
}
```

Response:

```
{
    id: <unique_request_id>,
    type: NewTaskEncryptionKey,
    result : {
        workerEncryptionKey : 'some-encryption-key',
        workerSig : 'sign(response params)'
    }
}
```

### `DeploySecretContract` messages
Request:
```
{
    id: <unique_request_id>,
    type: DeploySecretContract,
    input: {
        preCode: 'the-bytecode',
        encryptedArgs: 'hex of the encrypted args',
        encryptedFn: 'hex of the encrypted function signature',
        userDHKey: 'the-user-dh-pubkey',
        gasLimit: 'the-user-selected-gaslimit',
        contractAddress: 'the-address-of-the-contract'
    }
}
```

Response:
```
{
    id: <unique_request_id>,
    type: DeploySecretContract,
    result : {
        output: 'the-deployed-bytecode', // AKA exeCode
        preCodeHash: 'hash-of-the-precode-bytecode',
        delta: {key: 0, data: ...},
        usedGas: 'amount-of-gas-used',
        ethereumPayload: 'hex of payload for a call to the ethereum contract'',
        ethereumAddress: 'address of the ethereum contract to call',
        signature: 'enclave-signature',
    }

}
```

### `ComputeTask` message
Request:
```
{
    id: <unique_request_id>,
    type: ComputeTask,
    input: {
        taskID: 'the ID of the task'
        encryptedArgs: 'hex of the encrypted args',
        encryptedFn: 'hex of the encrypted function signature',
        userDHKey: 'the-user-dh-pubkey',
        gasLimit: 'the-user-selected-gaslimit', // from ethereum not rpc
        contractAddress: 'the-address-of-the-contract'
    }
}
```

Response:
```
{
    id: <unique_request_id>,
    type: ComputeTask,
    result : {
        output: 'the-output-of-the-execution',
        delta: {key, data},
        usedGas: 'amount-of-gas-used',
        ethereumPayload: 'hex of payload for a call to the ethereum contract'',
        ethereumAddress: 'address of the ethereum contract to call',
        signature: 'enclave-signature',
    }

}
```

### `FailedTask` error message
If a `ComputeTask` or `DeployTask` fails on the protocol level this message will be returned.
```
{
    id: <unique_request_id>,
    type: FailedTask,
    result : {
        output: 'the-output-of-the-execution',
        usedGas: 'amount-of-gas-used',
        signature: 'enclave-signature',
    }
}
```

## General `Error` system message

Any Code error:

```
{
    id: <unique_request_id>,
    type: <the_request_type>,
    msg : "some error message",
}
```
