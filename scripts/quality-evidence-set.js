const fs = require("node:fs");
const path = require("node:path");

function projectPath(...parts) {
  return path.resolve(__dirname, "..", ...parts);
}

function parseValue(raw) {
  if (raw === "null") {
    return null;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && raw.trim() !== "") {
    return numeric;
  }

  return raw;
}

function setByPath(target, dottedPath, value) {
  const keys = dottedPath.split(".");
  let cursor = target;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!Object.prototype.hasOwnProperty.call(cursor, key) || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[keys[keys.length - 1]] = value;
}

function main() {
  const [fieldPath, rawValue] = process.argv.slice(2);
  if (!fieldPath || rawValue === undefined) {
    console.error("Usage: node scripts/quality-evidence-set.js <field.path> <value>");
    process.exit(1);
  }

  const evidencePath = projectPath("artifacts", "scorecard.90d.evidence.json");
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));

  setByPath(evidence, fieldPath, parseValue(rawValue));
  evidence.updatedAt = new Date().toISOString();

  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), "utf8");

  console.log("Updated evidence:");
  console.log(`${fieldPath} = ${rawValue}`);
}

if (require.main === module) {
  main();
}
