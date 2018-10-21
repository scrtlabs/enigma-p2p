const pull = require('pull-stream');
const Verifier = require('./receiver/StateSyncReqVerifier');

/**
 * from providerStream => verify (consensus)
 * */
module.exports.verificationStream = (read)=>{
    return _verificationStream(read);
};

/**
 * After verificationStream => into db
 * */
module.exports.toDbStream = (read)=>{
    return _toDbStream(read);
};

module.exports.fromDbStream = (read) =>{
    return _fromDbStream(read);
};
/**
 * parses the data from the requester into a format that core can read
 * this is preperation before loading the deltas from the db.
 * */
module.exports.requestParserStream = (read) =>{
    return _requestParserStream(read);
};

/**
 * Taking the result from the Database (done by the provider)
 * and parse them into network mode (i.e msgpack etc.)
 * */

module.exports.toNetworkParser = (read) =>{
    return _toNetworkParse(read);
};


function _fakeParseFromDbToNetwork(dbResult, callback){
    let parsed = dbResult;
    let isError = null;
    callback(isError, dbResult);
}
// this takes result from the db (done by the provider) and
// returns the result directly into the other peer stream (source)
function _toNetworkParse(read){
    return function readble(end,cb){
        read(end,(end,data)=>{
            if(data!=null){
                _fakeParseFromDbToNetwork(data, (err,parsedResult)=>{
                    if(err){
                        cb(err, null);
                    }else{
                        cb(end, parsedResult);
                    }
                });
            }else{
                cb(end,null);
            }
        });
    };
}
function _fakeFromDbStream(data, callback){
    let dbResult = data;
    let isError = null;
    callback(isError, dbResult);
}

// fake load from the database, this will return the deltas for the requester
function _fromDbStream(read){
    return function readble(end,cb){
        read(end,(end,data)=>{
            if(data != null){
                _fakeFromDbStream(data,(err,dbResult)=>{
                    if(err){
                        console.log("error in fakeFromDbStream");
                        cb(err,null);
                    }else{
                        cb(end,data);
                    }
                })
            }else{
                cb(end,null);
            }
        });
    };
}

// used by _requestParserStream() this should parse the msgs from network
// into something that core can read and load from db
function _fakeRequestParser(data, callback){
    let parsedData = data;
    let err = null;
    callback(err, parsedData);
}

function _requestParserStream(read){
  return function readble(end,cb){
    read(end,(end,data)=>{
        if(data != null){
            _fakeRequestParser(data,(err,parsed)=>{
                if(err){
                    cb(true,null);
                }else{
                    cb(end,parsed);
                }
            });
        }else{
            cb(end,null);
        }
    });
  }
};

// used by _toDbStream()
// TODO:: replace with some real access to core/ipc
function fakeSaveToDb(data,callback){
    let status = true;
    console.log("[saveToDb] : " + data);
    callback(status);
}
function _toDbStream(read){
    read(null, function next(end,data){

        if(end === true) return;

        if(end) throw end;

        //TODO:: placeholder - save states into db with core.
        fakeSaveToDb(data, (status)=>{
            if(!status){
                console.log("some fake error saving to db ");
                throw end;
            }else{
                read(null,next);
            }
        });
    });
}
function _verificationStream(read){

    return function readble(end,cb){
        read(end,(end,data)=>{
            if(data !=null){
                //TODO:: placeholder for future ethereum veirfier.
                // verify the data
                new Verifier().verify(data,(isOk)=>{
                    if(isOk){
                        cb(end,data);
                    }else{
                        cb(true,null);
                    }
                });
            }else{
                cb(end,null);
            }
        });
    }
}