import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cleanEnvironment = {
  HOME: process.env.HOME,
  PATH: process.env.PATH,
};

function runBash(script, environment = {}) {
  return spawnSync("bash", [script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...cleanEnvironment, ...environment },
  });
}

test("release image deploy client fails closed when configuration is missing", () => {
  const result = runBash("scripts/deploy-release-image.sh");

  assert.equal(result.status, 64);
  assert.match(result.stderr, /Required environment variable LETPOT_DEPLOY_HOST is not set/);
});

test("production release summary fails closed when configuration is missing", () => {
  const result = runBash("scripts/create-production-release.sh");

  assert.equal(result.status, 64);
  assert.match(result.stderr, /Required environment variable GITHUB_REPOSITORY is not set/);
});

test("server deploy endpoint rejects every command except an exact deploy SHA", () => {
  const result = runBash("ops/server/letpot-maker-deploy", {
    SSH_ORIGINAL_COMMAND: "status",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported deployment command/);
});

test("server deploy endpoint rejects extra arguments before reading image data", () => {
  const result = runBash("ops/server/letpot-maker-deploy", {
    SSH_ORIGINAL_COMMAND: `deploy ${"a".repeat(40)} unexpected`,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unexpected deployment arguments/);
});
