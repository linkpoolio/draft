import { expect } from "chai";

import { BetterSet } from "../../../libs/better-set";

describe("BetterSet", () => {
  it("difference()", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([3, 4, 5, 7]);

    // Act & Assert
    expect([...setA.difference(setB)]).to.have.ordered.members([1, 2]);
  });

  it("filter()", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const filter = (element: number) => element > 2;

    // Act & Assert
    expect([...setA.filter(filter)]).to.have.ordered.members([3, 5]);
  });

  it("intersection()", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([3, 4, 5, 7]);

    // Act & Assert
    expect([...setA.intersection(setB)]).to.have.ordered.members([3, 5]);
  });

  it("isDisjoint() is false", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3]);
    const setB = new BetterSet([3, 4, 5]);

    // Act & Assert
    expect(setA.isDisjoint(setB)).to.be.false;
  });

  it("isDisjoint() is true", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3]);
    const setB = new BetterSet([4, 5, 6]);

    // Act & Assert
    expect(setA.isDisjoint(setB)).to.be.true;
  });

  it("isSubset() is false", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([2, 5]);

    // Act & Assert
    expect(setA.isSubset(setB)).to.be.false;
  });

  it("isSubset() is true", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([2, 5]);

    // Act & Assert
    expect(setB.isSubset(setA)).to.be.true;
  });

  it("isSuperset() is false", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([2, 5]);

    // Act & Assert
    expect(setB.isSuperset(setA)).to.be.false;
  });

  it("isSuperset() is true", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([2, 5]);

    // Act & Assert
    expect(setA.isSuperset(setB)).to.be.true;
  });

  it("union()", async () => {
    // Act
    const setA = new BetterSet([1, 2, 3, 5]);
    const setB = new BetterSet([3, 4, 5, 7]);

    // Act & Assert
    expect([...setA.union(setB)]).to.have.ordered.members([1, 2, 3, 5, 4, 7]);
  });
});
