const Verifier = require('./receiver/StateSyncReqVerifier');
const EncoderUtil = require('../../common/EncoderUtil');;
/**
 * from providerStream => verify (consensus)
 * @param {stream} read
 * @return {function()}
 * */
module.exports.verificationStream = (read)=>{
  return _verificationStream(read);
};

/**
 * After verificationStream => into db
 * @param {stream} read
 * @return {function()}
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
 * @param {stream} read
 * @return {function()}
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

/** Parse the request state sync msg from the reciever before passing the request to the provider stream
 * msgpack serialize */

module.exports.toNetworkSyncReqParser = (read)=>{
  return _toNetworkSyncReqParser(read);
};
/**
 * used by the receiver yo store the deltas into db
 * //TODO:: replace the old toDbStream
 * After verificationStream => into db
 * @param {stream} read
 * @return {function()}
 * */
module.exports.throughDbStream = (read)=>{
  return _throughDbStream(read);
};
function _throughDbStream(read){
  return function readble(end,cb){
    read(end,(end,data)=>{
      if(data != null){
        fakeSaveToDb(data,(status)=>{
          if(!status){
            console.log('some fake error saving to db ');
            throw end;
          }else{
            cb(end,data);
          }
        });
      }else{
        cb(end,null);
      }
    });
  };
}

function _toNetworkSyncReqParser(read) {
  return function readble(end, cb) {
      read(end, (end, data) => {
        if (data != null) {
          // TODO:: every method must have toNetwork();
          // TODO:: parse the msg to msgpack serialization + buffer
          cb(end, data.toNetwork());
        } else {
          cb(end, null);
        }
      });
  };
}
function _fakeParseFromDbToNetwork(dbResult, callback) {
  const parsed = dbResult;
  const isError = null;
  callback(isError, parsed);
}
// this takes result from the db (done by the provider) and
// returns the result directly into the other peer stream (source)
function _toNetworkParse(read) {
  return function readble(end, cb) {
    read(end, (end, data)=>{
      if (data!=null) {
        _fakeParseFromDbToNetwork(data, (err, parsedResult)=>{
          if (err) {
            cb(err, null);
          } else {
            cb(end, parsedResult);
          }
        });
      } else {
        cb(end, null);
      }
    });
  };
}
function _fakeFromDbStream(data, callback) {
  const dbResult = data;
  const isError = null;
  callback(isError, dbResult);
}

// fake load from the database, this will return the deltas for the requester
function _fromDbStream(read) {
  return function readble(end, cb) {
    read(end, (end, data)=>{
      if (data != null) {
        _fakeFromDbStream(data, (err, dbResult)=>{
          if (err) {
            console.log('error in fakeFromDbStream');
            cb(err, null);
          } else {
            cb(end, data);
          }
        });
      } else {
        cb(end, null);
      }
    });
  };
}

// used by _requestParserStream() this should parse the msgs from network
// into something that core can read and load from db
function _fakeRequestParser(data, callback) {
  const parsedData = data;
  const err = null;
  callback(err, parsedData);
}

function _requestParserStream(read) {
  return function readble(end, cb) {
    read(end, (end, data)=>{
      if (data != null) {
        _fakeRequestParser(data, (err, parsed)=>{
          if (err) {
            cb(true, null);
          } else {
            cb(end, parsed);
          }
        });
      } else {
        cb(end, null);
      }
    });
  };
};

// used by _toDbStream()
// TODO:: replace with some real access to core/ipc
function fakeSaveToDb(data, callback) {
  const status = true;
  console.log('[saveToDbStream] : ' + JSON.stringify(data));
  callback(status);
}



function _toDbStream(read) {
  read(null, function next(end, data) {
    if (end === true) return;

    if (end) throw end;
    // TODO:: placeholder - save states into db with core.
    fakeSaveToDb(data, (status)=>{
      if (!status) {
        console.log('some fake error saving to db ');
        throw end;
      } else {
        read(null, next);
      }
    });
  });
}
function _verificationStream(read) {
  return function readble(end, cb) {
    read(end, (end, data)=>{
      if (data !=null) {
        data = EncoderUtil.decode(data);
        data = JSON.parse(data);
        // TODO:: placeholder for future ethereum veirfier.
        // verify the data
        new Verifier().verify(data, (isOk)=>{
          if (isOk) {
            cb(end, data);
          } else {
            cb(true, null);
          }
        });
      } else {
        cb(end, null);
      }
    });
  };
}
