const sourceEl = document.getElementById("source");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status-bar");
const exampleSelect = document.getElementById("example-select");
const lineInfoEl = document.getElementById("line-info");

const DEFAULT_SOURCE = `# Noeon Playground — v0.9
VERSION "0.9"
NETWORK "playground"
TASK "demo_thinker"

GOAL "Demonstrate perceive-reason-decide cycle"
BUDGET 1000 msat
DEADLINE 2026-12-31T23:59:59Z

PERCEIVE source=user_input modality=text filter=general timeout_ms=1000
INTUIT "Is the input coherent?" using=heuristic threshold=0.6
REASON strategy=deductive depth=3
DECIDE action=respond threshold=0.7 mode=satisfice
REFLECT "Was reasoning sound?" depth=standard
`;

sourceEl.value = DEFAULT_SOURCE;

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function updateLineInfo() {
  const pos = sourceEl.selectionStart;
  const text = sourceEl.value.slice(0, pos);
  const line = text.split("\n").length;
  const col = text.length - text.lastIndexOf("\n");
  if (lineInfoEl) lineInfoEl.textContent = `Ln ${line}, Col ${col}`;
}

function setOutput(text, isError = false, errorLine = null) {
  outputEl.textContent = text;
  outputEl.style.color = isError ? "#ff8a8a" : "#d8e8ff";
  sourceEl.classList.remove("has-error-line");
  if (errorLine) {
    sourceEl.dataset.errorLine = String(errorLine);
    sourceEl.classList.add("has-error-line");
    highlightErrorLine(errorLine);
  }
}

function highlightErrorLine(lineNum) {
  const lines = sourceEl.value.split("\n");
  if (lineNum > 0 && lineNum <= lines.length) {
    let start = 0;
    for (let i = 0; i < lineNum - 1; i++) start += lines[i].length + 1;
    sourceEl.focus();
    sourceEl.setSelectionRange(start, start + lines[lineNum - 1].length);
  }
}

async function api(path, body) {
  setStatus(`Calling ${path}…`);
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: sourceEl.value, with_protocol: "auto", ...body })
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || data.errors?.join(", ") || "Request failed");
    err.line = data.line;
    throw err;
  }
  setStatus("Ready");
  return data;
}

async function loadExamples() {
  try {
    const res = await fetch("/api/examples");
    const data = await res.json();
    for (const ex of data.examples || []) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name;
      exampleSelect.appendChild(opt);
    }
    exampleSelect.addEventListener("change", () => {
      const name = exampleSelect.value;
      if (!name) return;
      const ex = data.examples.find((e) => e.name === name);
      if (ex) {
        sourceEl.value = ex.source;
        setStatus(`Loaded ${name}`);
      }
    });
  } catch {
    setStatus("Examples unavailable (start server with npm run playground)");
  }
}

document.getElementById("btn-validate").addEventListener("click", async () => {
  setOutput("Validating…");
  try {
    const data = await api("/api/validate", {});
    setOutput(JSON.stringify(data, null, 2), !data.valid);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-compile").addEventListener("click", async () => {
  setOutput("Compiling…");
  try {
    const data = await api("/api/compile", { format: "ir" });
    setOutput(JSON.stringify(data, null, 2));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-run").addEventListener("click", async () => {
  setOutput("Running (kernel + protocol auto)…");
  try {
    const data = await api("/api/run", { trace: true });
    setOutput(JSON.stringify(data, null, 2), !data.success);
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

document.getElementById("btn-explain").addEventListener("click", async () => {
  setOutput("Generating explanation…");
  try {
    const data = await api("/api/explain", {});
    setOutput(data.explanation || JSON.stringify(data, null, 2));
  } catch (e) {
    setOutput(e.message, true, e.line);
  }
});

sourceEl.addEventListener("keyup", updateLineInfo);
sourceEl.addEventListener("click", updateLineInfo);
sourceEl.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-run").click();
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const start = sourceEl.selectionStart;
    const end = sourceEl.selectionEnd;
    sourceEl.value = `${sourceEl.value.slice(0, start)}  ${sourceEl.value.slice(end)}`;
    sourceEl.selectionStart = sourceEl.selectionEnd = start + 2;
  }
});

updateLineInfo();
loadExamples();
fetch("/api/status").then((r) => r.json()).then((s) => setStatus(`Noeon ${s.version} | LLM ${s.llm?.mode}`)).catch(() => {});
