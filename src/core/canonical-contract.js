'use strict';

const REPORT_SCHEMA = 'noeon.canonical.report/v1';

const REQUIRED_REPORT_KEYS = [
  'schema',
  'generatedAt',
  'success',
  'surface',
  'intent',
  'governance',
  'execution',
  'observability'
];

function validateCanonicalReport(report) {
  const missing = [];
  if (!report || typeof report !== 'object') {
    return { valid: false, missing: ['report'], schema: null };
  }

  for (const key of REQUIRED_REPORT_KEYS) {
    if (report[key] == null) missing.push(`report.${key}`);
  }

  if (report.schema && report.schema !== REPORT_SCHEMA) {
    missing.push(`report.schema !== ${REPORT_SCHEMA}`);
  }

  if (report.intent && report.intent.goal == null) {
    missing.push('report.intent.goal');
  }

  if (report.governance) {
    if (report.governance.preflight_valid == null) missing.push('report.governance.preflight_valid');
  }

  if (report.execution) {
    if (!Array.isArray(report.execution.phases)) missing.push('report.execution.phases');
    if (!report.execution.plan) missing.push('report.execution.plan');
  }

  return {
    valid: missing.length === 0,
    missing,
    schema: report.schema || null
  };
}

module.exports = {
  REPORT_SCHEMA,
  REQUIRED_REPORT_KEYS,
  validateCanonicalReport
};
