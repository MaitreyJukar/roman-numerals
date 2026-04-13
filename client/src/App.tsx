import { useCallback, useMemo, useState } from "react";

const API_BASE = import.meta.env.PROD ? "" : "";

async function fetchText<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await res.json()) as T)
    : ((await res.text()) as unknown as T);
  if (!res.ok) {
    const msg = extractErrorMessage(body);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return body;
}

function extractErrorMessage(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return JSON.stringify(body);
}

type Tab = "single" | "range";

interface SinglePayload {
  input: string;
  output: string;
}

interface RangePayload {
  conversions: { input: string; output: string }[];
}

type Result =
  | { type: "single"; data: SinglePayload }
  | { type: "range"; data: RangePayload }
  | null;

export default function App() {
  const [tab, setTab] = useState<Tab>("single");
  const [singleInput, setSingleInput] = useState("1987");
  const [minInput, setMinInput] = useState("1");
  const [maxInput, setMaxInput] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [additive, setAdditive] = useState(false);

  const title = useMemo(
    () => ({
      single: "Single integer",
      range: "Inclusive range"
    }),
    []
  );

  const runSingle = useCallback(async () => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const q = encodeURIComponent(singleInput.trim());
      const add = additive ? "&additive=true" : "";
      const data = await fetchText<SinglePayload>(`${API_BASE}/romannumeral?query=${q}${add}`);
      setResult({ type: "single", data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [singleInput, additive]);

  const runRange = useCallback(async () => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const min = encodeURIComponent(minInput.trim());
      const max = encodeURIComponent(maxInput.trim());
      const add = additive ? "&additive=true" : "";
      const data = await fetchText<RangePayload>(`${API_BASE}/romannumeral?min=${min}&max=${max}${add}`);
      setResult({ type: "range", data });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [minInput, maxInput, additive]);

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1>Roman numeral service</h1>
          <p className="lede">
            A simple converter that converts integers to Roman numerals. The extended range supports up to 3,999,999.
          </p>
        </div>
        <a className="spec-link" href="https://en.wikipedia.org/wiki/Roman_numerals" target="_blank" rel="noreferrer">
          Wikipedia: Roman numerals
        </a>
      </header>

      <nav className="tabs" aria-label="Mode">
        <button type="button" className={tab === "single" ? "tab active" : "tab"} onClick={() => setTab("single")}>
          {title.single}
        </button>
        <button type="button" className={tab === "range" ? "tab active" : "tab"} onClick={() => setTab("range")}>
          {title.range}
        </button>
      </nav>

      <label className="additive-row">
        <input
          type="checkbox"
          checked={additive}
          onChange={(e) => setAdditive(e.target.checked)}
        />
        <span>
          Additive form (e.g. IIII for 4; barred thousands use IIII instead of IV for 4000) —{" "}
          <code>additive=true</code>
        </span>
      </label>

      <section className="panel">
        {tab === "single" ? (
          <div className="form">
            <label htmlFor="q">Integer (1–3,999,999; vinculum = combining overline)</label>
            <div className="row">
              <input
                id="q"
                inputMode="numeric"
                pattern="[0-9]*"
                value={singleInput}
                onChange={(e) => setSingleInput(e.target.value)}
              />
              <button type="button" onClick={runSingle} disabled={loading}>
                {loading ? "Converting…" : "Convert"}
              </button>
            </div>
          </div>
        ) : (
          <div className="form">
            <div className="grid2">
              <div>
                <label htmlFor="min">min</label>
                <input
                  id="min"
                  inputMode="numeric"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="max">max</label>
                <input
                  id="max"
                  inputMode="numeric"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                />
              </div>
            </div>
            <button type="button" className="full" onClick={runRange} disabled={loading}>
              {loading ? "Converting range…" : "Convert range (parallel batches)"}
            </button>
          </div>
        )}

        {error ? <p className="error">{error}</p> : null}

        {result?.type === "single" ? (
          <output className="output">
            <div className="pair">
              <span className="label">input</span>
              <span className="mono">{result.data.input}</span>
            </div>
            <div className="pair">
              <span className="label">output</span>
              <span className="mono lg">{result.data.output}</span>
            </div>
          </output>
        ) : null}

        {result?.type === "range" ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>input</th>
                  <th>output</th>
                </tr>
              </thead>
              <tbody>
                {result.data.conversions.map((row) => (
                  <tr key={row.input}>
                    <td className="mono">{row.input}</td>
                    <td className="mono">{row.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <footer className="footer">
        <span>
          Ops: <code>/health</code>, <code>/metrics</code> (Prometheus), JSON logs (Pino), Redis + LRU cache.
        </span>
      </footer>

      <style>{`
        .layout {
          max-width: 880px;
          margin: 0 auto;
          padding: 2.5rem 1.25rem 4rem;
        }
        .header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        h1 {
          font-size: 1.75rem;
          margin: 0 0 0.35rem;
          letter-spacing: -0.02em;
        }
        .lede {
          margin: 0;
          color: var(--muted);
          max-width: 52ch;
        }
        .spec-link {
          align-self: center;
          font-size: 0.9rem;
        }
        .additive-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: var(--muted);
          cursor: pointer;
          user-select: none;
        }
        .additive-row input {
          width: auto;
          cursor: pointer;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .tab {
          font: inherit;
          cursor: pointer;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          padding: 0.45rem 0.9rem;
          border-radius: 999px;
        }
        .tab.active {
          color: var(--text);
          border-color: var(--accent);
          background: rgba(61, 139, 253, 0.12);
        }
        .panel {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 1.25rem 1.35rem 1.5rem;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
        }
        .form label {
          display: block;
          font-size: 0.85rem;
          color: var(--muted);
          margin-bottom: 0.35rem;
        }
        input {
          width: 100%;
          font: 600 1rem var(--mono);
          padding: 0.55rem 0.65rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #0e1218;
          color: var(--text);
        }
        .row {
          display: flex;
          gap: 0.6rem;
        }
        .row input {
          flex: 1;
        }
        button {
          font: 600 0.95rem var(--sans);
          cursor: pointer;
          border: none;
          border-radius: 10px;
          padding: 0.55rem 1rem;
          background: linear-gradient(180deg, var(--accent), var(--accent-dim));
          color: white;
          white-space: nowrap;
        }
        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .grid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        button.full {
          width: 100%;
          margin-top: 0.85rem;
        }
        .error {
          margin-top: 1rem;
          color: var(--error);
          font-size: 0.95rem;
        }
        .output {
          display: block;
          margin-top: 1.25rem;
          padding: 1rem;
          border-radius: 10px;
          border: 1px dashed var(--border);
          background: rgba(0, 0, 0, 0.2);
        }
        .pair {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 0.35rem;
        }
        .pair .label {
          width: 3.5rem;
          font-size: 0.8rem;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .mono {
          font-family: var(--mono);
        }
        .mono.lg {
          font-size: 1.75rem;
          color: var(--success);
        }
        .table-wrap {
          margin-top: 1rem;
          max-height: 360px;
          overflow: auto;
          border-radius: 10px;
          border: 1px solid var(--border);
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .table th,
        .table td {
          padding: 0.45rem 0.65rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .table th {
          position: sticky;
          top: 0;
          background: #111822;
          color: var(--muted);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .footer {
          margin-top: 2rem;
          font-size: 0.85rem;
          color: var(--muted);
        }
        code {
          font-family: var(--mono);
          font-size: 0.85em;
          color: var(--text);
        }
      `}</style>
    </div>
  );
}
