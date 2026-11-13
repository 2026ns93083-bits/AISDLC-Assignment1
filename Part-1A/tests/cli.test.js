'use strict';

const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

function runCli(args) {
  return spawnSync(process.execPath, ['src/cli.js', ...args], {
    encoding: 'utf8'
  });
}

test('AC-008: valid CLI execution emits only one JSON success response', () => {
  const result = runCli(['120000', '12', '12']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(output).sort(), [
    'emi',
    'schedule',
    'total_interest',
    'total_payment'
  ]);
});

test('AC-008: invalid CLI execution emits only one JSON error response', () => {
  const result = runCli(['1000', '0', '3.5']);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.deepEqual(Object.keys(output), ['error']);
  assert.deepEqual(Object.keys(output.error).sort(), ['code', 'message']);
  assert.equal(output.error.code, 'INVALID_TENURE');
  assert.ok(output.error.message.length > 0);
});

test('AC-008: valid zero-interest invocation emits JSON success output', () => {
  const result = runCli(['1000', '0', '3']);

  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.equal(output.emi, 333.33);
  assert.equal(output.schedule.at(-1).balance, 0);
});
