module.exports.list = function(val, params) {
  const parseVal =val.split(',');
  parseVal.forEach((ma)=>{
    let toReplace = '';
    let val = '';
    if (ma === 'B1') {
      val = 'B1';
      toReplace = params.B1Addr;
    }
    if (ma === 'B2') {
      val = 'B2';
      toReplace = params.B2Addr;
    }

    const idx = parseVal.indexOf(val);
    parseVal[idx] = toReplace;
  });
  params.configObject.bootstrapNodes = parseVal;
  params.changedKeys.push('bootstrapNodes');
  return parseVal;
};

module.exports.nickname = function(val,params) {
  const parsedVal =val.toString();
  params.configObject.nickname = parsedVal;
  params.changedKeys.push('nickname');
  return parsedVal;
};

module.exports.port = function(val, params) {
  let parseVal =val.toString();
  if (parseVal === 'B1') {
    parseVal = params.B1Port;
  }
  if (parseVal === 'B2') {
    parseVal = params.B2Port;
  }
  params.configObject.port = parseVal;
  params.changedKeys.push('port');
  return parseVal;
};

module.exports.idPath = function(val,params) {
  let parsedVal = val.toString();
  if (parsedVal === 'B1') {
    parsedVal = params.B1Path;
  }
  if (parsedVal === 'B2') {
    parsedVal = params.B2Path;
  }

  params.configObject.idPath = parsedVal;
  params.changedKeys.push('idPath');
  return parsedVal;
};

// module.exports.enigmaContractAddress = function(val,params) {
//     params.configObject.enigmaContractAddress = val;
//     params.changedKeys.push('enigmaContractAddress');
//     return val;
//   };

module.exports.opener= "  ______       _                         _____ ___  _____  \n" +
    " |  ____|     (_)                       |  __ \\__ \\|  __ \\ \n" +
    " | |__   _ __  _  __ _ _ __ ___   __ _  | |__) | ) | |__) |\n" +
    " |  __| | '_ \\| |/ _` | '_ ` _ \\ / _` | |  ___/ / /|  ___/ \n" +
    " | |____| | | | | (_| | | | | | | (_| | | |    / /_| |     \n" +
    " |______|_| |_|_|\\__, |_| |_| |_|\\__,_| |_|   |____|_|     \n" +
    "                  __/ |                                    \n" +
    "                 |___/                                     ";



