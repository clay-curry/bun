import { join } from "path";
import { tmpdir } from "os";
import { realpathSync } from "fs";
import { spawnSync } from "bun";
import { describe, test, expect, beforeAll } from "bun:test";
import { bunEnv, bunExe, tempDirWithFiles } from "harness";

let cwd: string;

beforeAll(() => {
  const regexTestDir = join(realpathSync(tmpdir()), "bun-regex-test");

  cwd = tempDirWithFiles(regexTestDir, {
    // an arbitrary module
    "arbitry.js": "console.log('invoked arbitrary.js !');",
    // package.json with arbitrary scripts
    "package.json": JSON.stringify({
      "name": "run-regex-test",
      "description": "invokes scripts from CLI and package.scripts using regex patterns",
      "scripts": {
        "echo:sub1": "echo sub1 succeeded",
        "echo:sub2": "abacadabra this should error",
        "echo:sub3": "echo sub3 succeeded",
        "echo": "pnpm run /^echo:/",
        "test:subroutine-one": "echo 'invoked test:subroutine-one'",
        "test:subroutine-two": "echo 'invoked test:subroutine-two'",
        "test": "bun run /^test:/",
        "arbitrary": "bun run arbitrary.js",
      },
    }),
  });
});

// verifies regex semantics described in 'https://pnpm.io/cli/run#running-multiple-scripts'

describe("bun", () => {
  test("should return an error (no matching scripts)", () => {
    const nonMatchingPattern = new RegExp(/^no-match.js$/);
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [bunExe(), "run", nonMatchingPattern.toString()],
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toMatch(/no matching scripts/);
    expect(exitCode).toBe(1);
  });
  test("should invoke 'arbitrary.js' module", () => {
    const arbitraryModulePattern = "arbitrary.js";
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [bunExe(), "run", `${arbitraryModulePattern}`], // coerce type to string (without surrounding quotes)
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toMatch(/invoked arbitrary.js/);
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should invoke 'arbitrary' script in package.json (without quotes)", () => {
    const arbitraryRegexPattern = new RegExp(/^arbitrary$/).toString();
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [bunExe(), "run", `${arbitraryRegexPattern}`], // coerce type to string (without surrounding quotes)
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toMatch(/invoked arbitrary.js/);
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should invoke 'arbitrary' script in package.json (with single quotes)", () => {
    const arbitraryRegexPattern = new RegExp(/^arbitrary$/).toString();
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      // TODO: determine if this test is necessary (or desired)
      cmd: [bunExe(), "run", `'${arbitraryRegexPattern}'`], // coerce type to string (with single quotes)
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toMatch(/invoked arbitrary.js/);
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
  test("should invoke 'arbitrary' script in package.json (with single quotes)", () => {
    const arbitraryRegexPattern = new RegExp(/^arbitrary$/).toString();
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      // TODO: determine if this test is necessary (or desired)
      cmd: [bunExe(), "run", `"${arbitraryRegexPattern}"`], // coerce type to string (with double quotes)
      env: bunEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toMatch(/invoked arbitrary.js/);
    expect(stderr.toString()).toBeEmpty();
    expect(exitCode).toBe(0);
  });
});
test("should invoke every 'echo:' subroutine. should fail for one", () => {
  const arbitraryRegexPattern = new RegExp(/^echo:/).toString();
  const { exitCode, stdout, stderr } = spawnSync({
    cwd,
    // TODO: determine if this test is necessary (or desired)
    cmd: [bunExe(), "run", `${arbitraryRegexPattern}`], // coerce type to string (with double quotes)
    env: bunEnv,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(stdout.toString()).toMatch(/invoked arbitrary.js/);
  expect(stderr.toString()).toBeEmpty();
  expect(exitCode).toBe(0);
});
test("should invoke every 'test:' subroutine in package.json", () => {
  const matchingPattern = new RegExp(/^test:/);
  const { exitCode, stdout, stderr } = spawnSync({
    cwd,
    cmd: [bunExe(), matchingPattern.toString()],
    env: bunEnv,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(stdout.toString()).toMatch(/invoked unit.js/);
  expect(stdout.toString()).toMatch(/invoked test:lint/);
  expect(stdout.toString()).toMatch(/successful test:integration/);
  expect(stderr.toString()).toBeEmpty();
  expect(exitCode).toBe(0);
});
// TODO: add test for 'bun run [a-z]rbitrary' (character classes)
// TODO: add test for 'bun run [^a-z]rbitrary' (negated character classes)
// TODO: add test for 'bun run [arbity]{9}' (quantifiers)
// TODO: add test for 'bun run (?=)' (positive lookahead)
// TODO: add test for 'bun run (?!)' (negative lookahead)
// TODO: add test for 'bun run (?<=)' (positive lookbehind)
// TODO: add test for 'bun run (?<!)' (negative lookbehind)
// TODO: add test for 'bun run /(.)\1/' (backreferences)
// TODO: add test for 'bun run /(?<foo>bar) \k<foo>/' (named backreferences)
