/* eslint-disable valid-jsdoc */
const rimraf = require('rimraf');
const randomize = require('randomatic');

/**
 * Generate variable size random string from Aa0
 * @param {Integer} size
 * @return {string} result
 * */
module.exports.randLenStr = function(size) {
  return randomize('Aa0', size);
};
/**
 * generate random integer with max
 * @param {Integer} max
 */
module.exports.getRandomInt = function(max) {
  return _randomInt(max);
};

function _randomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

module.exports.getRandomByteArray = function(size) {
  const output = [];
  for (let i=0; i<size; ++i) {
    output.push(_randomInt(256));
  }
  return output;
};

module.exports.sleep = function(ms) {
  return _sleep(ms);
};

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.rm_Minus_Rf = async (path)=>{
  return new Promise((resolve, reject)=>{
    _deleteFolderFromOSRecursive(path, (err)=>{
      if (err) reject(err);
      else resolve();
    });
  });
};

module.exports.deleteFolderFromOSRecursive = function(path, callback) {
  _deleteFolderFromOSRecursive(path, callback);
};

/**
 * same as rm -rf <some folder>
 *   @param {string} path
 *   @param {function} callback
 */
function _deleteFolderFromOSRecursive(path, callback) {
  rimraf(path, callback);
}
