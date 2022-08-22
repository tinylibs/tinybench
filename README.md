# tinybench

Benchmark your code easily with Tinybench, a simple, tiny and light-weight
benchmarking library!
You can run your benchmarks in multiple javascript runtimes, Tinybench is
completely based on the Web APIs with proper timing using `process.hrtime` or
`performance.now`.

- Accurate and precise timing based on the environment
- `Event` and `EventTarget` compatible events
- Statistically analyzed values
- Calculated Percentiles
- Fully detailed results

_In case you need more tiny libraries like tinypool or tinyspy, please consider submitting an [RFC](https://github.com/tinylibs/rfcs)_

## Installing

```bash
$ npm install -D tinybench
```

## Usage

You can start benchmarking by instantiating the `Bench` class and adding
benchmark tasks to it.

```ts
const bench = new Bench({ time: 100 });

bench
  .add("foo", () => {
    // code
  })
  .add("bar", async () => {
    // code
  });

await bench.run();
```

The `add` method accepts a task name and a task function, so it can benchmark
it! This method returns a reference to the Bench instance, so it's possible to
use it to create an another task for that instance.

Note that the task name should always be unique in an instance, because Tinybench stores the tasks based
on their names in a `Map`.

## Authors

| <a href="https://github.com/Aslemammad"> <img width='150' src="https://avatars.githubusercontent.com/u/37929992?v=4" /><br> Mohammad Bagher </a> |
| ------------------------------------------------------------------------------------------------------------------------------------------------ |

## Credits

| <a href="https://github.com/uzploak"> <img width='150'
src="https://avatars.githubusercontent.com/u/5059100?v=4" /><br> Uzlopak </a> |
<a href="https://github.com/poyoho"> <img width='150'
src="https://avatars.githubusercontent.com/u/36070057?v=4" /><br> poyoho </a> |
| ---- | ----|
