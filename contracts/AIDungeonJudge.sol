// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PrecompileConsumer.sol";

contract AIDungeonJudge is PrecompileConsumer {
    address public constant LLM_PRECOMPILE = 0x0802;

    event FloorJudged(
        uint256 indexed floorId,
        address indexed player,
        string winner,
        string reason,
        uint8 score,
        uint256 xpBonus
    );

    function judgeFloor(
        uint256 floorId,
        string calldata floorLog      // battle log dari JS
    ) external {
        string memory prompt = string(abi.encodePacked(
            "You are a fair dungeon judge in Ritual Arena. ",
            "Analyze this floor battle and give verdict.\n\n",
            "Floor: ", floorId.toString(), "\n",
            "Battle Log:\n", floorLog, "\n\n",
            "Return ONLY valid JSON:\n",
            "{\"winner\":\"Player\" or \"Enemy\",\"reason\":\"short 1 sentence\",\"score\":85}"
        ));

        bytes memory input = abi.encodeWithSignature(
            "infer(string)", 
            prompt
        ); // encoding sederhana dulu

        bytes memory result = _executePrecompile(LLM_PRECOMPILE, input);

        // Decode sederhana (kita refine nanti)
        (string memory winner, string memory reason, uint8 score) = 
            ("Player", "Excellent performance in this floor!", 88);

        uint256 xpBonus = uint256(score) * 10;

        emit FloorJudged(floorId, msg.sender, winner, reason, score, xpBonus);
    }
}