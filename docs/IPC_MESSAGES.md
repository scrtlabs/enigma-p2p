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

### `IdentityChallenge` message

Request:

```
{
    id : <unique_request_id>,
    type : IdentityChallenge,
    nonce :
}
```
Response:
```
{
    id : <unique_request_id>,
    type : IdentityChallenge,
    result : {
        nonce : hex,
        signature : hex
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
       delta : []
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
        tips : [Array<{address,key,delta}>]
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
        tips : [Array<{address,key,delta}>]
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
        userPubKey: 'the-user-dh-pubkey',
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
        exeCode: 'the-deployed-bytecode',
        preCodeHash: 'hash-of-the-precode-bytecode',
        delta: {0, delta},
        usedGas: 'amount-of-gas-used',
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
        encryptedArgs: 'hex of the encrypted args',
        encryptedFn: 'hex of the encrypted function signature',
        userPubKey: 'the-user-dh-pubkey',
        gasLimit: 'the-user-selected-gaslimit',
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
        delta: {key, delta},
        usedGas: 'amount-of-gas-used',
        signature: 'enclave-signature',
    }
    
}
```
