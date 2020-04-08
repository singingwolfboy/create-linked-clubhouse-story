import { getInput, setOutput, setFailed, debug } from "@actions/core";
// import { wait } from "./wait";

async function run(): Promise<void> {
  try {
    const ms: string = getInput("milliseconds");
    debug(`Waiting ${ms} milliseconds ...`);

    debug(new Date().toTimeString());
    // await wait(parseInt(ms, 10));
    debug(new Date().toTimeString());

    setOutput("time", new Date().toTimeString());
  } catch (error) {
    setFailed(error.message);
  }
}

run();
