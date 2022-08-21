import { test, expect } from "vitest";
import { Bench } from "../src/";

test("basic", async () => {
  const bench = new Bench();
  bench.add("foo", async () => {
    console.log('here 1')
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    console.log('here')
  });
  await bench.run();

  // console.log(bench.benches);
}, 50000);
