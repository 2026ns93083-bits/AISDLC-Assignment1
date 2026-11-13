const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const label = process.argv[2] || 'run';
const gates = [
  { name: 'LINT', cmd: 'npx eslint src tests' },
  { name: 'SECURITY', cmd: 'npx eslint -c .harness/eslint.security.config.js src' },
  { name: 'DEPS', cmd: 'npm audit --audit-level=high' },
  { name: 'TESTS', cmd: 'node --test' }
];

const results = gates.map(g => {
  const r = spawnSync(g.cmd, { cwd: root, shell: true, encoding: 'utf8', timeout: 120000 });
  return { gate: g.name, command: g.cmd, passed: r.status === 0, exitCode: r.status, stdout: r.stdout, stderr: r.stderr };
});

const report = { label, timestamp: new Date().toISOString(), passed: results.every(r => r.passed), results };
const dir = path.join(root, 'evidence', 'harness-results');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${label}-${report.timestamp.replace(/[:.]/g, '-')}.json`), JSON.stringify(report, null, 2));

for (const r of results) console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.gate}`);
console.log(report.passed ? 'HARNESS: PASS' : 'HARNESS: FAIL');
process.exit(report.passed ? 0 : 1);