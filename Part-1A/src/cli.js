'use strict';

function runCli() {
  throw new Error('not implemented');
}

if (require.main === module) {
  runCli();
}

module.exports = { runCli };
