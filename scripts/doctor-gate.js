'use strict';

const { runDoctor, formatDoctorReport } = require('../src/doctor');
const { buildProductionGateStatusSummary } = require('../src/core/production-gate-status');

const jsonMode = process.argv.includes('--json');
const fileFlagIdx = process.argv.indexOf('--file');
const file = fileFlagIdx >= 0 ? process.argv[fileFlagIdx + 1] : undefined;

function findCheck(report, name) {
  return report.checks.find((check) => check.name === name);
}

function evaluateReport(report) {
  const probes = findCheck(report, 'execution_path_probes');
  const productionGateCheck = findCheck(report, 'production_gate');
  const artifact = buildProductionGateStatusSummary();
  const probesOk = probes?.ok === true;
  const productionArtifactOk = !artifact.available || artifact.ok === true;
  const ok = report.ok === true && probesOk && productionArtifactOk;
  return { ok, probes, probesOk, productionGateCheck, productionArtifact: artifact };
}

function printFailureDetails(report, probes, probesOk, productionArtifact) {
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
  if (productionArtifact.available && productionArtifact.ok !== true) {
    console.error('Doctor gate FAILED: production gate artifact reports FAIL');
    if (productionArtifact.checks?.failed?.length) {
      console.error(`  failed checks: ${productionArtifact.checks.failed.join(', ')}`);
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
  const { ok, probes, probesOk, productionGateCheck, productionArtifact } = evaluateReport(report);

  if (jsonMode) {
    console.log(JSON.stringify({
      ...report,
      productionGateArtifact: productionArtifact
    }, null, 2));
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
    if (productionGateCheck) {
      const color = productionGateCheck.ok ? '\x1b[32m' : '\x1b[31m';
      const status = productionGateCheck.ok ? 'PASS' : 'FAIL';
      console.log(`\n${color}▸ production_gate (doctor check): ${status}\x1b[0m`);
      console.log(`  ${productionGateCheck.detail}`);
      if (productionGateCheck.recommendation) {
        console.log(`  → ${productionGateCheck.recommendation}`);
      }
    }
    if (productionArtifact.available) {
      const color = productionArtifact.ok ? '\x1b[32m' : '\x1b[31m';
      const status = productionArtifact.ok ? 'PASS' : 'FAIL';
      console.log(`\n${color}▸ production gate artifact: ${status}\x1b[0m`);
      console.log(`  checks ${productionArtifact.checks?.passed}/${productionArtifact.checks?.total}`);
    } else {
      console.log('\n\x1b[33m▸ production gate artifact: —\x1b[0m');
      console.log('  Run npm run gate:production to record signed ACT + plugin policy gate');
    }
  }

  if (!ok) {
    printFailureDetails(report, probes, probesOk, productionArtifact);
    process.exit(1);
  }

  if (!jsonMode) {
    console.log('\n\x1b[32mDoctor gate: PASS (execution_path_probes ok)\x1b[0m\n');
  }
}

main();
