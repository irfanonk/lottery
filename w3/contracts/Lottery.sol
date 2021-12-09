// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.4.17;

contract Lottery {
    address public maneger;
    address[] public players;

    function Lottery() public {
        maneger = msg.sender;
    }

    modifier onlyManeger() {
        require(msg.sender == maneger);
        _;
    }
    modifier minJoinPrize() {
        require(msg.value > .01 ether);
        _;
    }

    function joinLottery() public payable minJoinPrize {
        players.push(msg.sender);
    }

    function random() private view returns (uint256) {
        return uint256(keccak256(block.difficulty, now, players));
    }

    function pickWinner() public onlyManeger {
        uint256 idx = 10 % players.length;
        players[idx].transfer(this.balance);
        players = new address[](0);
    }

    function getPlayers() public view returns (address[]) {
        return players;
    }
}
