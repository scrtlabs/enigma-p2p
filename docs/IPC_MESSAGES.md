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
    id : <unique_request_id>
    type : GetRegistrationParams
}
```
Response: 
```
{
    id : <unique_request_id>
    type : GetRegistrationParams
    signingKey : hex 
    quote : base64 
}
```

### `IdentityChallenge` message 

Request:

```
{
    id : <unique_request_id>
    type : IdentityChallenge
    nonce : 
}
```
Response:
```
{
    id : <unique_request_id>
    type : IdentityChallenge
    nonce :
    signature :  
}
```
## Enclave Read only Database related 

### `GetTip` message 
Request:
```
{
    id : <unique_request_id>
    type : GetTip 
    input : [Secret Contract Address]
}
```
Response:
```
{
   id : <unique_request_id>
   type : GetTip 
   result : {
       key : [],
       delta : [],
   }
}
```
### `GetTips` message 

Request:
```
{
    id : <unique_request_id>
    type : Ge:tTips 
    input : [Array<Secret Contract Address>]
}
```
Response:
```
{
    id : <unique_request_id>
    type : GetTips 
    result : {
        tips : [Array<{address,key,delta}>]
    }
}
```
### `GetAllTips` message
Request:
```
{
    id : <unique_request_id>
    type : GetAllTips 
}
```
Response:
```
{
    id : <unique_request_id>
    type: GetAllTips
    result : {
        tips : [Array<{address,key,delta}>]
    }
}
```
### `GetAllAddrs` message
Request:
```
{
    id : <unique_request_id>
    type : GetAllAddrs
}
```
Response:
```
{
    id : <unique_request_id>
    type : GetAllAddrs
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
    type : GetDelta 
    input : [{address, key}]
}
```
Response: 
```
{
    id : <unique_request_id>
    type : GetDelta
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
    type : GetDelta 
    input : [{address, key}]
}
```
Response: 
```
{
    id : <unique_request_id>
    type : GetDeltas
    deltas : [{address,key,data}]
}
```
### `GetContract` message 
Request: 
```
{
    id : <unique_request_id>
    type : GetContract
    input : [address]
}
```
Response: 
```
{
    id : <unique_request_id>
    type : GetContract
    result : {
        bytecode : []
    }
}
```

## Master Node Key-Exchange related 

## Computation related 

### `DeploySecretContract` message 

### `ComputeTask` message 






















