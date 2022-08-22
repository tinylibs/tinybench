import { test, expect } from "vitest";
import { Bench } from "../src/";

test("basic", async () => {
  const bench = new Bench();
  bench
    .add("foo", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    })
    .add("bar", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  await bench.run();
  const benches = bench.tasks;

  expect(benches.length).toEqual(2);

  expect(benches[0].name).toEqual("foo");
  expect(benches[0].result.totalTime).toBeGreaterThan(50);

  expect(benches[1].name).toEqual("bar");
  expect(benches[1].result.totalTime).toBeGreaterThan(100);

  // console.log(bench.benches);
});
