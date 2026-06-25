// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract PrecompileConsumer {
    function _executePrecompile(address precompile, bytes memory input) 
        internal returns (bytes memory) 
    {
        (bool success, bytes memory output) = precompile.call(input);
        require(success, "Precompile call failed");
        return output;
    }
}
