'use strict';

const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

function runCli(args) {
  return spawnSync(process.execPath, ['src/cli.js', ...args], {
    encoding: 'utf8'
  });
}

test('AC-001: inclusive boundary loans are accepted with requested schedule lengths', () => {
  const cases = [
    { args: ['1', '0', '1'], scheduleLength: 1 },
    { args: ['100000000', '50', '480'], scheduleLength: 480 }
  ];

  for (const { args, scheduleLength } of cases) {
    const result = runCli(args);
    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.equal(output.schedule.length, scheduleLength);
  }
});

test('AC-004: missing positional argument returns INVALID_ARGUMENT_COUNT', () => {
  const result = runCli(['1000', '0']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_ARGUMENT_COUNT');
});

test('AC-004: extra positional argument returns INVALID_ARGUMENT_COUNT', () => {
  const result = runCli(['1000', '0', '3', 'extra']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_ARGUMENT_COUNT');
});

test('AC-004: malformed principal returns INVALID_PRINCIPAL', () => {
  const result = runCli(['abc', '0', '3']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_PRINCIPAL');
});

test('AC-004: malformed rate returns INVALID_RATE', () => {
  const result = runCli(['1000', 'NaN', '3']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_RATE');
});

test('AC-004: malformed tenure returns INVALID_TENURE', () => {
  const result = runCli(['1000', '0', 'months']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_TENURE');
});

test('AC-004: out-of-range principal returns INVALID_PRINCIPAL', () => {
  const result = runCli(['0', '0', '1']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_PRINCIPAL');
});

test('AC-004: out-of-range rate returns INVALID_RATE', () => {
  const result = runCli(['1', '50.01', '1']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_RATE');
});

test('AC-004: out-of-range tenure returns INVALID_TENURE', () => {
  const result = runCli(['1', '0', '481']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_TENURE');
});

test('AC-004: fractional tenure returns INVALID_TENURE', () => {
  const result = runCli(['1000', '0', '3.5']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_TENURE');
});

test('AC-004: principal with more than two fractional digits returns INVALID_PRINCIPAL', () => {
  const result = runCli(['1.001', '0', '1']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).error.code, 'INVALID_PRINCIPAL');
});
