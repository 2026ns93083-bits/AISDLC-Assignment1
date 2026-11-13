'use strict';

const { calculateEmi } = require('./emi.js');
const { validateInput } = require('./validate.js');

function runCli() {
  const input = validateInput(process.argv.slice(2));
  if (input.error) {
    process.stdout.write(`${JSON.stringify(input)}\n`);
    process.exitCode = 1;
    return;
  }

  const result = calculateEmi(input.principal, input.annualRate, input.tenure);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = 0;
}

if (require.main === module) {
  runCli();
}

module.exports = { runCli };
