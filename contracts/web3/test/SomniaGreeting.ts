import { expect } from "chai";
import { ethers } from "hardhat";

describe("SomniaGreeting", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const SomniaGreeting = await ethers.getContractFactory("SomniaGreeting");
    const greeting = await SomniaGreeting.deploy("Hello Somnia!");
    return { greeting, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right greeting", async function () {
      const { greeting } = await deployFixture();
      expect(await greeting.greeting()).to.equal("Hello Somnia!");
    });

    it("Should set the right owner", async function () {
      const { greeting, owner } = await deployFixture();
      expect(await greeting.owner()).to.equal(owner.address);
    });
  });

  describe("Set Greeting", function () {
    it("Should update the greeting correctly", async function () {
      const { greeting } = await deployFixture();
      await greeting.setGreeting("Hello World!");
      expect(await greeting.greeting()).to.equal("Hello World!");
    });

    it("Should emit GreetingChanged event", async function () {
      const { greeting, owner } = await deployFixture();
      await expect(greeting.setGreeting("Event test"))
        .to.emit(greeting, "GreetingChanged")
        .withArgs(owner.address, "Event test");
    });
  });
});
