const level = require("level");
const nodeUtils = require("../common/utils");

class LevelDbApi {
  constructor(dbName, logger) {
    this._dbName = dbName;
    this._db = null;
    this._logger = logger;
  }
  /**
   * Creates level DB
   * */
  open() {
    this._db = level(this._dbName);
  }
  /**
   * Closes the DB.
   * @param {Function} callback
   * */
  close(callback) {
    return this._db.close(err => {
      if (err) {
        this._logger.error(`received an error while trying to close the DB: ${err}`);
        return callback(err);
      }
      this._logger.debug(`closed DB successfully`);
      callback(null);
    });
  }
  /**
   * removes an entry from the DB
   * @param {string} key
   * @param {Function} callback
   * */
  delete(key, callback) {
    if (this._isOpen()) {
      this._db.del(key, err => {
        this._logger.error(`received an error while trying to delete a value from the DB: ${err}`);
        callback(err);
      });
    } else {
      const err = "DB is closed";
      this._logger.error(err);
      callback(err);
    }
  }
  /**
   * inserts data to the DB
   * @param {string} key
   * @param {string} value
   * @param {Function} callback
   * */
  put(key, value, callback) {
    if (this._isOpen()) {
      this._db.put(key, value, err => {
        if (err) {
          this._logger.error(`received an error while trying to put a value to the DB: ${err}`);
        }
        callback(err);
      });
    } else {
      const err = "DB is closed";
      this._logger.error(err);
      callback(err);
    }
  }
  /**
   * reads an entry from the DB
   * @param {string} key
   * @param {Function} callback
   * */
  get(key, callback) {
    if (this._isOpen()) {
      this._db.get(key, (err, value) => {
        if (err) {
          this._logger.error(`received an error while trying to read ${key} from DB: ${err}`);
          callback(err);
        } else {
          if (nodeUtils.isString(value)) {
            value = JSON.parse(value);
          }
          callback(null, value);
        }
      });
    } else {
      const err = "DB is closed";
      this._logger.error(err);
      callback(err);
    }
  }
  /**
   * reads all DB keys
   * @param {Function} callback
   * @return {Array} a list with DB keys
   * */
  getAllKeys(callback) {
    this._readFromDB({ keys: true, values: false }, callback);
  }
  /**
   * reads all DB data
   * @param {Function} callback
   * @return {Object} an object the maps key->value pairs
   * */
  getAll(callback) {
    this._readFromDB({ keys: true, values: true }, (err, list) => {
      if (!err) {
        const res = {};
        for (const item in list) {
          res[item.key] = item.value;
        }
        callback(null, res);
      }
      callback(err);
    });
  }
  // put value only if it doesn't exist.
  safePut(key, value, callback) {
    if (this._isOpen()) {
      this.get(key, (err, value) => {
        if (err) {
          // value dont exist
          this.put(key, value, err => {
            callback(err);
          });
        } else {
          // value exists
          callback("value exists");
        }
      });
    } else {
      callback("db closed");
    }
  }
  putBatch(objs, callback) {
    const operations = [];
    objs.forEach(o => {
      operations.push({ type: "put", key: o.key, value: o.value });
    });
    this._batch(operations, err => {
      callback(err);
    });
  }
  _isOpen() {
    return !!this._db;
  }
  _batch(operations, callback) {
    if (this._isOpen()) {
      this._db.batch(operations, err => {
        callback(err);
      });
    } else {
      callback("db closed");
    }
  }
  _readFromDB(options, callback) {
    const data = [];

    this._db
      .createReadStream(options)
      .on("data", data => {
        data.push(data);
      })
      .on("error", err => {
        this._logger.error(`received an error from the read-stream while trying to read DB keys: ${err}`);
        callback(err);
      })
      .on("close", () => {
        const err = "the DB read-stream closed unexpectedly while trying to read keys";
        this._logger.error(err);
        callback(err);
      })
      .on("end", function() {
        callback(null, data);
      });
  }
}
module.exports = LevelDbApi;

/** mini test * /
 *
 */
// let hexKey = '0xd00fb2b59610c1dc98929e0891b4ef3bba493d18e39e6d4eb949c811ccc52944';
// let byteKey = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186,
//                73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 68];
// let byteKey2 = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186,
//                 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 61];
// let byteKey3 = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186,
//                 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 62];
// let byteKey4 = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186,
//                 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 63];
// let byteKey5 = [208, 15, 178, 181, 150, 16, 193, 220, 152, 146, 158, 8, 145, 180, 239, 59, 186,
//                 73, 61, 24, 227, 158, 109, 78, 185, 73, 200, 17, 204, 197, 41, 64];
// let db = new LevelDbApi("./here");
// db.open();
// db.put(byteKey, JSON.stringify({deltas : [byteKey2, byteKey3]}), (err)=>{
//     console.log("is err? ");
//
//     db.get(byteKey, (err,value)=>{
//         console.log("is err? " + err);
//
//         console.log(value.deltas.length);
//         value.deltas.push(byteKey4);
//         value.deltas.push(byteKey5);
//         db.put(byteKey,JSON.stringify(value),(err)=>{
//           console.log("is err? " + err);
//
//           db.get(byteKey, (err,value)=>{
//             console.log(value.deltas);
//           });
//
//         });
//     })
// });
