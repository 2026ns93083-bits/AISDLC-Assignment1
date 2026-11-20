'use strict';

const fs = require('node:fs');
const { ConfigurationError, ServiceError } = require('./llm');
const { ApplicationError, triage } = require('./triage');

async function readStdin(stdin) {
  if (typeof stdin === 'string') {
    return stdin;
  }
  if (!stdin) {
    return '';
  }

  stdin.setEncoding('utf8');
  let text = '';
  for await (const chunk of stdin) {
    text += chunk;
  }
  return text;
}

async function runCli({ argv, stdin, stdout, stderr, triageImpl }) {
  if (!Array.isArray(argv) || argv.length > 1) {
    stderr.write('usage error: expected at most one email file\n');
    return 1;
  }

  let emailText;
  try {
    if (argv.length === 1) {
      emailText = fs.readFileSync(argv[0], 'utf8');
    } else {
      emailText = await readStdin(stdin);
    }
  } catch (error) {
    stderr.write('input error: unable to read the email\n');
    return 1;
  }

  try {
    const result = await (triageImpl || triage)(emailText);
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      stderr.write('configuration error\n');
    } else if (error instanceof ServiceError) {
      stderr.write('service error\n');
    } else if (error instanceof ApplicationError) {
      stderr.write('application error\n');
    } else {
      stderr.write('application error\n');
    }
    return 1;
  }
}

async function main() {
  const exitCode = await runCli({
    argv: process.argv.slice(2),
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  });
  process.exitCode = exitCode;
}

if (require.main === module) {
  main();
}

module.exports = { runCli };
