'use strict';

const { runDoctor, formatDoctorReport } = require('../src/doctor');

const jsonMode = process.argv.includes('--json');
const fileFlagIdx = process.argv.indexOf('--file');
const file = fileFlagIdx >= 0 ? process.argv[fileFlagIdx + 1] : undefined;

function findCheck(report, name) {
  return report.checks.find((check) => check.name === name);
}

function evaluateReport(report) {
  const probes = findCheck(report, 'execution_path_probes');
  const probesOk = probes?.ok === true;
  const ok = report.ok === true && probesOk;
  return { ok, probes, probesOk };
}

function printFailureDetails(report, probes, probesOk) {
  if (report.ok !== true) {
    console.error('Doctor gate FAILED: report.ok !== true');
  }
  if (!probesOk) {
    console.error('Doctor gate FAILED: execution_path_probes check failed');
    if (probes?.detail) {
      console.error(`  detail: ${probes.detail}`);
    }
    if (probes?.recommendation) {
      console.error(`  recommendation: ${probes.recommendation}`);
    }
  }
  for (const check of report.checks.filter((entry) => !entry.ok)) {
    console.error(`  FAIL ${check.name}: ${check.detail}`);
    if (check.recommendation) {
      console.error(`    → ${check.recommendation}`);
    }
  }
}

function main() {
  const report = runDoctor({ file });
  const { ok, probes, probesOk } = evaluateReport(report);

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n\x1b[36m═══ Noeon Doctor Gate ═══\x1b[0m\n');
    console.log(formatDoctorReport(report));
    if (probes) {
      const color = probes.ok ? '\x1b[32m' : '\x1b[31m';
      const status = probes.ok ? 'PASS' : 'FAIL';
      console.log(`\n${color}▸ execution_path_probes (alpha gate probe): ${status}\x1b[0m`);
      console.log(`  ${probes.detail}`);
      if (probes.recommendation) {
        console.log(`  → ${probes.recommendation}`);
      }
    }
  }

  if (!ok) {
    printFailureDetails(report, probes, probesOk);
    process.exit(1);
  }

  if (!jsonMode) {
    console.log('\n\x1b[32mDoctor gate: PASS (execution_path_probes ok)\x1b[0m\n');
  }
}

main();
