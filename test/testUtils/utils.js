var rimraf = require('rimraf');


module.exports.sleep = function(ms) {
    return _sleep(ms);
};
function _sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}


module.exports.deleteFolderFromOSRecursive = function(path, callback){
  _deleteFolderFromOSRecursive(path,callback);
};
/**
 * same as rm -rf <some folder>
 *   @param {string} path
 *   @param {function} callback
 */
function _deleteFolderFromOSRecursive(path, callback){rimraf(path, callback);}
