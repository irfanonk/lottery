const assert = require("assert");
const ganache = require("ganache-cli");
const Web3 = require("web3");
const { interface, bytecode } = require("../scripts/compile");
const web3 = new Web3(ganache.provider());

let lottery;
let accounts;

beforeEach(async () => {
  // Get a list of all accounts
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ gas: 1_000_000, from: accounts[0] });
  // console.log("lott", lottery);
});
describe("Lottery", function () {
  it("can deploy", () => {
    assert.ok(lottery.options.address);
  });
  it("one can join", async () => {
    await lottery.methods.joinLottery().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[1],
    });
    assert.equal(accounts[1], players[0]);
    assert.equal(1, players.length);
  });
  it("multiple players can join", async () => {
    await lottery.methods.joinLottery().send({
      from: accounts[0],
      value: web3.utils.toWei("0.02", "ether"),
    });
    await lottery.methods.joinLottery().send({
      from: accounts[1],
      value: web3.utils.toWei("0.03", "ether"),
    });
    await lottery.methods.joinLottery().send({
      from: accounts[2],
      value: web3.utils.toWei("0.03", "ether"),
    });
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(accounts[2], players[2]);
    assert.equal(3, players.length);
  });
  it("requires a minimum amount of ether to join", async () => {
    let executed;
    try {
      await lottery.methods.joinLottery().send({
        from: accounts[0],
        // value: web3.utils.toWei("0.02", "ether"),
        value: 0,
      });
      executed = "success";
    } catch (err) {
      executed = "fail";
    }

    assert.equal("fail", executed);
  });

  it("only manager can call pickWinner", async () => {
    let executed;
    try {
      // At least one person must enter the lottery else pickWinner will fail
      // even if invoked by the manager and this test will pass
      // because the error will be caught by the catch block.

      await lottery.methods.joinLottery().send({
        from: accounts[1],
        value: web3.utils.toWei("0.02", "ether"),
      });
      await lottery.methods.pickWinner().send({
        from: accounts[2],
      });
      executed = "success";
    } catch (err) {
      executed = "fail";
    }

    assert.equal("fail", executed);
  });
  it("returns winner", async () => {
    await lottery.methods.joinLottery().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });
    await lottery.methods.joinLottery().send({
      from: accounts[2],
      value: web3.utils.toWei("0.03", "ether"),
    });
    await lottery.methods.joinLottery().send({
      from: accounts[3],
      value: web3.utils.toWei("0.03", "ether"),
    });

    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });
    const winner = await lottery.methods
      .latestWinner()
      .call({ from: accounts[0] });

    assert.ok(winner);
  });
  it("sends ether to winner and remove players", async () => {
    const initialBalance = await web3.eth.getBalance(lottery.options.address);
    await lottery.methods.joinLottery().send({
      from: accounts[1],
      value: web3.utils.toWei("0.02", "ether"),
    });
    await lottery.methods.joinLottery().send({
      from: accounts[2],
      value: web3.utils.toWei("0.22", "ether"),
    });
    await lottery.methods.joinLottery().send({
      from: accounts[3],
      value: web3.utils.toWei("0.03", "ether"),
    });
    const firstBalance = await web3.eth.getBalance(lottery.options.address);

    console.log("banalce", initialBalance, firstBalance);
    await lottery.methods.pickWinner().send({
      from: accounts[0],
    });
    const winner = await lottery.methods
      .latestWinner()
      .call({ from: accounts[0] });

    const players = await lottery.methods.getPlayers().call({
      from: accounts[0],
    });
    if (accounts.includes(winner)) {
      assert.ok(winner);
    } else {
      assert.fail();
    }
    assert(0 < firstBalance);
    assert.equal(0, players.length);
  });
});
