import { test, expect } from "vitest";
import { Bench } from "../src/";

test("basic", async () => {
  const bench = new Bench({ time: 100 });
  bench
    .add("foo", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    })
    .add("bar", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  await bench.run();

  const tasks = bench.tasks;

  expect(tasks.length).toEqual(2);

  expect(tasks[0].name).toEqual("foo");
  expect(tasks[0].result.totalTime).toBeGreaterThan(50);

  expect(tasks[1].name).toEqual("bar");
  expect(tasks[1].result.totalTime).toBeGreaterThan(100);

  expect(tasks[0].result.hz * tasks[0].result.period).toBe(1);
});

test("events order", async () => {
  const controller = new AbortController();
  const bench = new Bench({ signal: controller.signal });
  bench
    .add("foo", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    })
    .add("bar", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    })
    .add("error", async () => {
      throw new Error("fake");
    })
    .add("abort", async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

  const events: string[] = [];

  bench.addEventListener("start", () => {
    events.push("start");
  });

  bench.addEventListener("error", () => {
    events.push("error");
  });

  bench.addEventListener("reset", () => {
    events.push("reset");
  });

  bench.addEventListener("cycle", () => {
    events.push("cycle");
  });

  bench.addEventListener("abort", () => {
    events.push("abort");
  });

  bench.addEventListener("complete", () => {
    events.push("complete");
  });

  setTimeout(() => {
    controller.abort();
  }, 150);

  await bench.run();
  bench.reset()

  expect(events).toEqual([
    "start",
    "error",
    "cycle",
    "cycle",
    "cycle",
    "abort",
    "complete",
    "reset"
  ]);
  // aborted has no results
  expect(bench.getTask('abort').result).toBeUndefined()
});

