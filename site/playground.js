const sourceEl = document.getElementById("source");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status-bar");
const exampleSelect = document.getElementById("example-select");
const lineInfoEl = document.getElementById("line-info");

let activeExampleName = null;

const FALLBACK_SOURCE = `profile "general"
version "1.0.0-alpha"

module hello

program hello_world {
  objective "Demonstrate general profile execution through unified VM"
  context domain=general audience=developer mode=cognitive

  observe input modality=text source="user"
  understand context=developer_intent method=semantic_summary confidence=0.72
  reason strategy=deductive depth=2
  decide action=greet threshold=0.6
  act action=greet channel=console safety=low
  feedback source=user signal=acceptance window=1
  reflect "execution quality" depth=standard
}
`;

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

function formatExampleLabel(ex) {
  const title = ex.title || ex.name;
  if (ex.category) return `[${ex.category}] ${title}`;
  return title;
}

async function loadExamples() {
  try {
    const res = await fetch("/api/examples");
    const data = await res.json();
    const examples = data.examples || [];

    for (const ex of examples) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = formatExampleLabel(ex);
      exampleSelect.appendChild(opt);
    }

    const hello = examples.find((e) => e.name === "hello.noeon");
    if (hello) {
      sourceEl.value = hello.source;
      activeExampleName = hello.name;
      exampleSelect.value = hello.name;
    } else {
      sourceEl.value = FALLBACK_SOURCE;
    }

    exampleSelect.addEventListener("change", () => {
      const name = exampleSelect.value;
      if (!name) {
        activeExampleName = null;
        return;
      }
      const ex = examples.find((e) => e.name === name);
      if (ex) {
        sourceEl.value = ex.source;
        activeExampleName = name;
        setStatus(`Loaded ${ex.title || name}`);
      }
    });
  } catch {
    sourceEl.value = FALLBACK_SOURCE;
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
  const isNoeon = activeExampleName?.endsWith(".noeon");
  setOutput(isNoeon ? "Running (cognitive workflow)…" : "Running (kernel + protocol auto)…");
  try {
    const withProtocol = isNoeon ? "off" : "auto";
    const data = await api("/api/run", { trace: true, with_protocol: withProtocol });
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
