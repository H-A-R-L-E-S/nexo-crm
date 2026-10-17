import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const next = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
let child;
let stopping = false;

function stop(signal) {
  stopping = true;
  child?.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, [next, ...args], {
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      child = undefined;
      if (stopping) resolve(false);
      else if (code === 0) resolve(true);
      else reject(new Error(`next ${args[0]} terminó con ${signal ?? code}`));
    });
  });
}

try {
  const built = await run(["build", "--webpack"]);
  if (built && !stopping) await run(["start", "--hostname", "127.0.0.1", "--port", "3100"]);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
