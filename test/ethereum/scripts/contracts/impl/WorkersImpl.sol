pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import { EnigmaCommon } from "./EnigmaCommon.sol";
import { EnigmaState } from "./EnigmaState.sol";
import "../utils/SolRsaVerify.sol";
import "../utils/Base64.sol";
import { Bytes } from "../utils/Bytes.sol";

/**
 * @author Enigma
 *
 * Library that maintains functionality associated with workers
 */
library WorkersImpl {
    using SafeMath for uint256;
    using Bytes for bytes;

    event Registered(address custodian, address signer);
    event Unregistered(address custodian);
    event DepositSuccessful(address from, uint value);
    event WithdrawSuccessful(address to, uint value);
    event LoggedIn(address workerAddress);
    event LoggedOut(address workerAddress);

    uint constant internal WORD_SIZE = 32;

    // Borrowed from https://github.com/ethereum/solidity-examples/blob/cb43c26d17617d7dad34936c34dd8f423453c1cf/src/unsafe/Memory.sol#L57
    // Copy 'len' bytes from memory address 'src', to address 'dest'.
    // This function does not check the or destination, it only copies
    // the bytes.
    function copy(uint src, uint dest, uint len) internal pure {
        // Copy word-length chunks while possible
        for (; len >= WORD_SIZE; len -= WORD_SIZE) {
            assembly {
                mstore(dest, mload(src))
            }
            dest += WORD_SIZE;
            src += WORD_SIZE;
        }

        // Copy remaining bytes
        uint mask = 256 ** (WORD_SIZE - len) - 1;
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }

    function extract_element(bytes memory src, uint offset, uint len) internal pure returns (bytes memory) {
        bytes memory o = new bytes(len);
        uint srcptr;
        uint destptr;
        assembly{
            srcptr := add(add(src,32), offset)
            destptr := add(o,32)
        }
        copy(srcptr, destptr, len);
        return o;
    }

    // Borrowed from https://ethereum.stackexchange.com/a/50528/24704
    function bytesToAddress(bytes memory bys) internal pure returns (address addr) {
        assembly {
          addr := mload(add(bys,20))
        }
    }

    function shiftLeft(bytes1 a, uint8 n) internal pure returns (bytes1) {
        return bytes1(uint8(a) * uint8(2) ** n);
    }

    // Get bit value at position
    function getBit(bytes1 a, uint8 n) internal pure returns (bool) {
        return a & shiftLeft(0x01, n) != 0;
    }

    function readBytes1(
        bytes memory b,
        uint256 index
    )
    public
    pure
    returns (bytes1 result)
    {
        // Arrays are prefixed by a 32 byte length field
        index += 32;

        // Read the bytes4 from array memory
        assembly {
            result := mload(add(b, index))
        // Solidity does not require us to clean the trailing bytes.
        // We do it anyway
            result := and(result, 0xFF00000000000000000000000000000000000000000000000000000000000000)
        }
        return result;
    }

    function registerImpl(EnigmaState.State storage state, address _stakingAddress, address _signer, bytes memory _report,
        bytes memory _signature)
    public {
        // TODO: consider exit if both signer and custodian are matching
        // If the custodian is not already register, we add an index entry
        EnigmaCommon.Worker storage worker = state.workers[msg.sender];
        if (worker.signer == address(0)) {
            state.workerAddresses.push(msg.sender);
        }
        // MOCK
        //require(verifyReportImpl(_report, _signature) == 0, "Verifying signature failed");

        //uint i = 0;
        // find the word "Status" in the _report
        //while( i < _report.length && !(
        //    _report[i] == 0x53 &&
        //    _report[i+1] == 0x74 &&
        //    _report[i+2] == 0x61 &&
        //    _report[i+3] == 0x74 &&
        //    _report[i+4] == 0x75 &&
        //    _report[i+5] == 0x73
        //)) {
        //    i++;
        //}
        //require( i < _report.length, "isvEnclaveQuoteStatus not found in report");

        // Add the length of 'Status":"' to find where the quote starts
        //i=i+9;

        //bytes memory isvEnclaveQuoteStatus = extract_element(_report, i, 2);
        // TODO uncomment line below when we get proper status "OK", instead of "GROUP_OUT_OF_DATE"
        // require((isvEnclaveQuoteStatus[0] == 0x4f) && (isvEnclaveQuoteStatus[1] == 0x4b),
        //     "isvEnclaveQuoteStatus is not OK");

        // find the word "Body" in the _report, which always comes after isvEnclaveQuoteStatus, otherwise reset i=0
        //while( i < _report.length && !(
        //    _report[i] == 0x42 &&
        //    _report[i+1] == 0x6f &&
        //    _report[i+2] == 0x64 &&
        //    _report[i+3] == 0x79
        //)) {
        //    i++;
        //}
        //require( i < _report.length, "isvEnclaveQuoteBody not found in report");

        // Add the length of 'Body":"' to find where the quote starts
        //i=i+7;

        // 576 bytes is the length of the quote
        //bytes memory quoteBody = extract_element(_report, i, 576);

        //bytes memory quoteDecoded = Base64.decode(quoteBody);

        // extract the needed fields. For reference see, pages 21-23
        // https://software.intel.com/sites/default/files/managed/7e/3b/ias-api-spec.pdf
        // bytes memory cpuSvn = extract_element(quoteDecoded, 48, 16);
        // bytes memory mrEnclave = extract_element(quoteDecoded, 112, 32);
        //bytes memory isvProdid = extract_element(quoteDecoded, 304, 2);
        //bytes memory reportData = extract_element(quoteDecoded, 368, 64);

        //require(getBit(readBytes1(extract_element(quoteDecoded, 96, 16), 0), 1) == state.debug, "Debug does not match");
        //require(extract_element(quoteDecoded, 176, 32).equals(state.mrSigner), "mrSigner does not match");
        // 2 bytes represented little-endian, so least significant goes first
        //state.principal == _signer ?
        //    require(isvProdid.equals(hex"0200"), "isvProdID not set to 2 for Key Management node") :
        //    require(isvProdid.equals(hex"0100"), "isvProdID not set to 1 for worker node");
        //require(extract_element(quoteDecoded, 306, 2).equals(state.isvSvn), "isvSvn does not match");
        //require(bytesToAddress(reportData) == _signer, "Signer does not match contents of quote");

        worker.stakingAddress = _stakingAddress;
        worker.signer = _signer;
        worker.report = _report;
        worker.status = EnigmaCommon.WorkerStatus.LoggedOut;

        emit Registered(msg.sender, _signer);
    }

    function unregisterImpl(EnigmaState.State storage state) public {
        address operatingAddress = (state.workers[msg.sender].status != EnigmaCommon.WorkerStatus.Unregistered) ?
            msg.sender : state.stakingToOperatingAddresses[msg.sender];
        delete state.stakingToOperatingAddresses[state.workers[operatingAddress].stakingAddress];
        delete state.workers[operatingAddress];

        emit Unregistered(operatingAddress);
    }

    function setOperatingAddressImpl(EnigmaState.State storage state, address _operatingAddress)
    public {
        state.stakingToOperatingAddresses[msg.sender] = _operatingAddress;
    }

    function getReportImpl(EnigmaState.State storage state, address _custodian)
    public
    view
    returns (address, bytes memory)
    {
        EnigmaCommon.Worker memory worker = state.workers[_custodian];
        // The RLP encoded report and signer's address for the specified worker
        require(worker.signer != address(0), "Worker not registered");
        return (worker.signer, worker.report);
    }

    function verifyReportImpl(bytes memory _data, bytes memory _signature)
    public
    view
    returns (uint) {
        /*
        this is the modulus and the exponent of intel's certificate, you can extract it using:
        `openssl x509 -noout -modulus -in intel.cert`
        and `openssl x509 -in intel.cert  -text`
        */
        bytes memory exponent = hex"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010001";
        bytes memory modulus = hex"A97A2DE0E66EA6147C9EE745AC0162686C7192099AFC4B3F040FAD6DE093511D74E802F510D716038157DCAF84F4104BD3FED7E6B8F99C8817FD1FF5B9B864296C3D81FA8F1B729E02D21D72FFEE4CED725EFE74BEA68FBC4D4244286FCDD4BF64406A439A15BCB4CF67754489C423972B4A80DF5C2E7C5BC2DBAF2D42BB7B244F7C95BF92C75D3B33FC5410678A89589D1083DA3ACC459F2704CD99598C275E7C1878E00757E5BDB4E840226C11C0A17FF79C80B15C1DDB5AF21CC2417061FBD2A2DA819ED3B72B7EFAA3BFEBE2805C9B8AC19AA346512D484CFC81941E15F55881CC127E8F7AA12300CD5AFB5742FA1D20CB467A5BEB1C666CF76A368978B5";

        return SolRsaVerify.pkcs1Sha256VerifyRaw(_data, _signature, exponent, modulus);
    }

    function loginImpl(EnigmaState.State storage state) public {
        EnigmaCommon.Worker storage worker = state.workers[msg.sender];
        worker.status = EnigmaCommon.WorkerStatus.LoggedIn;
        worker.workerLogs.push(EnigmaCommon.WorkerLog({
            workerEventType: EnigmaCommon.WorkerLogType.LogIn,
            blockNumber: block.number,
            balance: worker.balance
        }));
        emit LoggedIn(msg.sender);
    }

    function logoutImpl(EnigmaState.State storage state) public {
        address operatingAddress = (state.workers[msg.sender].status == EnigmaCommon.WorkerStatus.LoggedIn) ?
            msg.sender : state.stakingToOperatingAddresses[msg.sender];
        EnigmaCommon.Worker storage worker = state.workers[operatingAddress];
        worker.status = EnigmaCommon.WorkerStatus.LoggedOut;
        worker.workerLogs.push(EnigmaCommon.WorkerLog({
            workerEventType: EnigmaCommon.WorkerLogType.LogOut,
            blockNumber: block.number,
            balance: worker.balance
        }));
        emit LoggedOut(operatingAddress);
    }

    function depositImpl(EnigmaState.State storage state, address _custodian, uint _amount)
    public
    {
        // MOCK
        //require(state.engToken.allowance(_custodian, address(this)) >= _amount, "Not enough tokens allowed for transfer");
        //require(state.engToken.transferFrom(_custodian, address(this), _amount), "Token transfer failed");

        EnigmaCommon.Worker storage worker = state.workers[state.stakingToOperatingAddresses[_custodian]];
        worker.balance = worker.balance.add(_amount);

        // MOCK
        //require(state.engToken.transferFrom(_custodian, address(this), _amount), "Token transfer failed");

        emit DepositSuccessful(_custodian, _amount);
    }

    function withdrawImpl(EnigmaState.State storage state, uint _amount)
    public
    {
        EnigmaCommon.Worker storage worker = state.workers[state.stakingToOperatingAddresses[msg.sender]];
        require(worker.balance >= _amount, "Not enough tokens in worker balance");

        worker.balance = worker.balance.sub(_amount);

        // MOCK
        //require(state.engToken.transfer(msg.sender, _amount), "Token transfer failed");

        emit WithdrawSuccessful(msg.sender, _amount);
    }

    function getWorkerParamsIndex(EnigmaState.State storage state, uint _blockNumber)
    internal
    view
    returns (uint)
    {
        // The workers parameters for a given block number
        int8 index = - 1;
        for (uint i = 0; i < state.workersParams.length; i++) {
            if (state.workersParams[i].firstBlockNumber <= _blockNumber &&
                (index == - 1 ||
                state.workersParams[i].firstBlockNumber > state.workersParams[uint(index)].firstBlockNumber)) {
                index = int8(i);
            }
        }
        require(index != - 1, "No workers parameters entry for specified block number");
        return uint(index);
    }

    function getParams(EnigmaState.State storage state, uint _blockNumber)
    internal
    view
    returns (EnigmaCommon.WorkersParams memory) {
        uint index = getWorkerParamsIndex(state, _blockNumber);
        return state.workersParams[index];
    }

    function getFirstBlockNumberImpl(EnigmaState.State storage state, uint _blockNumber)
    public
    view
    returns (uint) {
        EnigmaCommon.WorkersParams memory params = getParams(state, _blockNumber);
        return params.firstBlockNumber;
    }

    function getWorkerParamsImpl(EnigmaState.State storage state, uint _blockNumber)
    public
    view
    returns (uint, uint, address[] memory, uint[] memory) {
        EnigmaCommon.WorkersParams memory params = getParams(state, _blockNumber);
        return (params.firstBlockNumber, params.seed, params.workers, params.stakes);
    }

    function selectWeightedRandomWorker(EnigmaState.State storage state, uint _paramIndex, bytes32 _scAddr, uint _nonce)
    internal
    view
    returns (address)
    {
        EnigmaCommon.WorkersParams memory params = state.workersParams[_paramIndex];
        uint tokenCpt = 0;
        for (uint i = 0; i < params.workers.length; i++) {
            if (params.workers[i] != address(0)) {
                tokenCpt = tokenCpt.add(params.stakes[i]);
            }
        }
        bytes32 randHash = keccak256(abi.encode(params.seed, _scAddr, _nonce));
        int randVal = int256(uint256(randHash) % tokenCpt);
        for (uint k = 0; k < params.workers.length; k++) {
            if (params.workers[k] != address(0)) {
                randVal -= int256(params.stakes[k]);
                if (randVal <= 0) {
                    return params.workers[k];
                }
            }
        }
        return params.workers[params.workers.length - 1];
    }

    function getWorkerGroupImpl(EnigmaState.State storage state, uint _blockNumber, bytes32 _scAddr)
    public
    view
    returns (address[] memory)
    {
        // Compile a list of selected workers for the block number and
        // secret contract.
        uint paramIndex = getWorkerParamsIndex(state, _blockNumber);
        uint fullWorkerGroupSize = state.workersParams[paramIndex].workers.length;
        uint workerGroupSize = fullWorkerGroupSize < state.workerGroupSize ? fullWorkerGroupSize : state.workerGroupSize;

        address[] memory selectedWorkers = new address[](workerGroupSize);
        uint nonce = 0;
        for (uint it = 0; it < workerGroupSize; it++) {
            do {
                address worker = selectWeightedRandomWorker(state, paramIndex, _scAddr, nonce);
                bool dup = false;
                for (uint id = 0; id < selectedWorkers.length; id++) {
                    if (worker == selectedWorkers[id]) {
                        dup = true;
                        break;
                    }
                }
                if (dup == false) {
                    selectedWorkers[it] = worker;
                }
                nonce++;
            }
            while (selectedWorkers[it] == address(0));
        }
        return selectedWorkers;
    }

    function getLatestWorkerLogImpl(EnigmaCommon.Worker memory worker, uint _blockNumber)
    public
    pure
    returns (EnigmaCommon.WorkerLog memory) {
        EnigmaCommon.WorkerLog memory workerLog;
        for (uint i = worker.workerLogs.length; i > 0; i--) {
            if (worker.workerLogs[i - 1].blockNumber < _blockNumber) {
                workerLog = worker.workerLogs[i - 1];
                break;
            }
        }
        return workerLog;
    }
}
