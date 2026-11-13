'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { calculateEmi, roundHalfUp } = require('../src/emi.js');

function sumInCents(schedule, field) {
  return schedule.reduce((sum, entry) => sum + Math.round(entry[field] * 100), 0);
}

test('AC-002: zero-interest 1000/0/3 returns the specified payments and totals', () => {
  const result = calculateEmi(1000, 0, 3);

  assert.equal(result.emi, 333.33);
  assert.equal(result.total_interest, 0);
  assert.equal(result.total_payment, 1000);
  assert.deepEqual(result.schedule, [
    { month: 1, emi: 333.33, interest: 0, principal: 333.33, balance: 666.67 },
    { month: 2, emi: 333.33, interest: 0, principal: 333.33, balance: 333.34 },
    { month: 3, emi: 333.34, interest: 0, principal: 333.34, balance: 0 }
  ]);
});

test('AC-003: positive-rate 120000/12/12 returns a complete reconciled schedule', () => {
  const result = calculateEmi(120000, 12, 12);

  assert.equal(result.emi, 10661.85);
  assert.equal(result.schedule.length, 12);
  assert.deepEqual(result.schedule[0], {
    month: 1,
    emi: 10661.85,
    interest: 1200,
    principal: 9461.85,
    balance: 110538.15
  });
  result.schedule.forEach((entry, index) => {
    assert.deepEqual(
      Object.keys(entry).sort(),
      ['balance', 'emi', 'interest', 'month', 'principal']
    );
    assert.equal(entry.month, index + 1);
  });
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.equal(sumInCents(result.schedule, 'interest'), Math.round(result.total_interest * 100));
  assert.equal(sumInCents(result.schedule, 'emi'), Math.round(result.total_payment * 100));
});

test('AC-005: representative loans reconcile totals and end without negative balances', () => {
  const cases = [
    [1, 0, 1],
    [100000000, 50, 480],
    [120000, 12, 12],
    [1000, 0, 3],
    [50000, 7.5, 36]
  ];

  for (const [principal, annualRate, tenure] of cases) {
    const result = calculateEmi(principal, annualRate, tenure);
    assert.equal(sumInCents(result.schedule, 'interest'), Math.round(result.total_interest * 100));
    assert.equal(sumInCents(result.schedule, 'emi'), Math.round(result.total_payment * 100));
    assert.equal(result.schedule.at(-1).balance, 0);
    assert.ok(result.schedule.every((entry) => entry.balance >= 0));
  }
});

test('AC-006: roundHalfUp handles ties and values on either side of ties', () => {
  assert.equal(roundHalfUp(0.005), 0.01);
  assert.equal(roundHalfUp(0.0049), 0);
  assert.equal(roundHalfUp(0.0051), 0.01);
  assert.equal(roundHalfUp(2.675), 2.68);
});

test('AC-007: 480-month calculation completes in under one second', () => {
  const startedAt = performance.now();
  const result = calculateEmi(100000000, 50, 480);
  const elapsedMs = performance.now() - startedAt;

  assert.ok(elapsedMs < 1000, `calculation took ${elapsedMs} ms`);
  assert.equal(result.schedule.length, 480);
});

test('AC-005: zero-interest final payment settles the remaining balance exactly', () => {
  const result = calculateEmi(1000, 0, 3);

  assert.equal(result.schedule.at(-1).emi, 333.34);
  assert.equal(result.schedule.at(-1).principal, 333.34);
  assert.equal(result.schedule.at(-1).balance, 0);
});
