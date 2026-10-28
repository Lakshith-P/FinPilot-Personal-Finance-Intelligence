import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Wallet, LayoutDashboard, Mic, Sparkles, ReceiptText, Target,
  ChartNoAxesCombined, FileText, ListOrdered, RefreshCw, Check,
  AlertTriangle, TrendingUp, Plus, Menu, X, LoaderCircle
} from "lucide-react";
import "./style.css";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8000")
  .replace(/\/+$/, "");
const categories = [
  "Food", "Transport", "Shopping", "Bills", "Health", "Education",
  "Entertainment", "Travel", "Savings", "Other"
];
const today = new Date().toLocaleDateString("en-CA");
const currentMonth = today.slice(0, 7);
const money = value => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value) || 0);

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status})`);
  }
  return data;
}

const jsonOptions = body => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

function App() {
  const [page, setPage] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendOK, setBackendOK] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_spent: 0, transaction_count: 0, by_category: []
  });

  const [expenseText, setExpenseText] = useState(
    "Spent ₹250 on lunch at Cafe Niloufer today"
  );
  const [draft, setDraft] = useState(null);

  const [receiptText, setReceiptText] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");

  const [notes, setNotes] = useState("");
  const [noteDrafts, setNoteDrafts] = useState([]);
  const [unclassified, setUnclassified] = useState([]);

  const [goalText, setGoalText] = useState(
    "I want to save ₹30000 in six months for a new laptop."
  );
  const [goalDraft, setGoalDraft] = useState(null);
  const [goals, setGoals] = useState([]);
  const [manualGoal, setManualGoal] = useState({
    name: "", target_amount: "", current_amount: "0", target_date: ""
  });

  const [budgets, setBudgets] = useState([]);
  const [budgetCategory, setBudgetCategory] = useState("Food");
  const [budgetAmount, setBudgetAmount] = useState("5000");

  const [insightMonth, setInsightMonth] = useState(currentMonth);
  const [insights, setInsights] = useState(null);

  const nav = [
    ["Overview", LayoutDashboard],
    ["Expense capture", Sparkles],
    ["Receipts", ReceiptText],
    ["Classify notes", FileText],
    ["Savings goals", Target],
    ["Budgets", ChartNoAxesCombined],
    ["Monthly insights", TrendingUp],
    ["Ledger", ListOrdered]
  ];

  async function refresh() {
    try {
      const [tx, sums, health] = await Promise.all([
        api("/api/transactions"),
        api("/api/summary"),
        api("/api/health")
      ]);
      setTransactions(tx);
      setSummary(sums);
      setBackendOK(health.status === "ok");
      setError("");
    } catch (e) {
      setBackendOK(false);
      setError(`Backend connection failed: ${e.message}`);
    }
  }

  async function refreshExtras() {
    try {
      const [g, b] = await Promise.all([
        api("/api/goals"), api("/api/budgets")
      ]);
      setGoals(g);
      setBudgets(b);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
    refreshExtras();
  }, []);

  function message(text) {
    setNotice(text);
    setError("");
  }

  function updateDraft(key, value) {
    setDraft(old => ({
      ...old,
      [key]: value,
      missing_fields: (old.missing_fields || []).filter(k => k !== key)
    }));
  }

  async function captureExpense(text = expenseText) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await api(
        "/api/transactions/extract",
        jsonOptions({ text })
      );
      setDraft({
        ...result,
        amount: result.amount ?? "",
        transaction_date: result.transaction_date ?? today,
        merchant: result.merchant ?? "",
        note: result.note || text,
        source_text: text
      });
      setExpenseText(text);
      message("Draft created. Check every field before saving.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is unavailable in this browser. Try Chrome or type your expense.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = event => {
      const spoken = event.results[0][0].transcript;
      setExpenseText(spoken);
      captureExpense(spoken);
    };
    recognition.onerror = () => setError(
      "Voice capture failed. Check your microphone permission."
    );
    recognition.start();
  }

  async function saveTransaction(item = draft) {
    if (!item) return;

    if (
      !item.amount || Number(item.amount) <= 0 ||
      !item.transaction_date || !item.merchant?.trim() ||
      !item.note?.trim()
    ) {
      setError("Complete the amount, date, merchant and note first.");
      return;
    }

    if (!window.confirm(`Save ${money(item.amount)} at ${item.merchant}?`)) {
      return;
    }

    setLoading(true);
    try {
      await api("/api/transactions", jsonOptions({
        amount: Number(item.amount),
        currency: "INR",
        transaction_date: item.transaction_date,
        merchant: item.merchant.trim(),
        category: item.category || "Other",
        note: item.note.trim(),
        source_text: item.source_text || item.note
      }));
      setDraft(null);
      message("Transaction saved to your ledger.");
      await refresh();
      setPage("Ledger");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadReceipt(file) {
    if (!file) return;
    setReceiptFileName(file.name);
    setError("");

    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        setReceiptText(await file.text());
        message("Receipt text loaded. Click Extract receipt.");
        return;
      }

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const form = new FormData();
        form.append("file", file);
        const result = await api("/api/receipts/extract", {
          method: "POST", body: form
        });
        setDraft({
          ...result,
          amount: result.amount ?? "",
          transaction_date: result.transaction_date ?? today,
          merchant: result.merchant ?? "",
          note: result.note || `Receipt: ${file.name}`,
          source_text: `Receipt file: ${file.name}`
        });
        message("Receipt draft created. Review before saving.");
        return;
      }

      if (file.type.startsWith("image/")) {
        setError("Image OCR is not configured yet. Use a text-based PDF or TXT receipt.");
        return;
      }

      setError("Use a TXT file or a text-based PDF.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function extractPastedReceipt() {
    if (!receiptText.trim()) {
      setError("Paste the receipt text or upload a TXT file first.");
      return;
    }
    setExpenseText(`Receipt: ${receiptText.trim()}`);
    await captureExpense(`Extract the transaction from this receipt: ${receiptText.trim()}`);
  }

  async function classifyNotes() {
    setLoading(true);
    setError("");
    try {
      const result = await api(
        "/api/notes/classify",
        jsonOptions({ notes })
      );
      setNoteDrafts((result.transactions || []).map(item => ({
        ...item,
        amount: item.amount ?? "",
        transaction_date: item.transaction_date ?? today,
        merchant: item.merchant ?? "",
        note: item.note || "",
        source_text: item.source_text || notes
      })));
      setUnclassified(result.unclassified_notes || []);
      message("Drafts are ready. Review and save each transaction separately.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveNoteDraft(item, index) {
    await saveTransaction(item);
    // Remove only after successful save; refresh to verify persistence.
    if (!error) {
      setNoteDrafts(old => old.filter((_, i) => i !== index));
    }
  }

  async function planGoal() {
    setLoading(true);
    setError("");
    try {
      const result = await api(
        "/api/goals/plan",
        jsonOptions({ text: goalText })
      );
      setGoalDraft(result);
      message("Goal plan generated. Review assumptions and milestones.");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveGoal(item) {
    if (!item) return;
    if (!window.confirm(`Save goal "${item.name}" for ${money(item.target_amount)}?`)) return;

    try {
      await api("/api/goals", jsonOptions({
        name: item.name,
        target_amount: Number(item.target_amount),
        current_amount: Number(item.current_amount || 0),
        target_date: item.target_date
      }));
      setGoalDraft(null);
      await refreshExtras();
      message("Savings goal saved.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function createManualGoal(event) {
    event.preventDefault();
    await saveGoal(manualGoal);
    setManualGoal({
      name: "", target_amount: "", current_amount: "0", target_date: ""
    });
  }

  async function saveBudget(event) {
    event.preventDefault();
    try {
      await api("/api/budgets", jsonOptions({
        category: budgetCategory,
        monthly_limit: Number(budgetAmount)
      }));
      await refreshExtras();
      message("Budget limit saved.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function generateInsights() {
    setLoading(true);
    setError("");
    try {
      const result = await api(
        "/api/insights/monthly",
        jsonOptions({ month: insightMonth })
      );
      setInsights(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const pageDescriptions = {
    "Overview": "Your finances, in focus.",
    "Expense capture": "Speak or type an expense, then verify the extracted details.",
    "Receipts": "Extract transaction details from receipt text or supported PDFs.",
    "Classify notes": "Convert spending notes into drafts that you approve individually.",
    "Savings goals": "Turn savings intentions into targets and milestones.",
    "Budgets": "Set category limits and compare them with recorded spending.",
    "Monthly insights": "Review monthly spending patterns and suggested actions.",
    "Ledger": "All confirmed transactions in one place."
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-icon"><Wallet size={22} /></span>
          <span>FinPilot<span className="brand-dot">.</span><small>PERSONAL FINANCE AI</small></span>
          <button className="icon-button mobile-close" onClick={() => setMobileMenu(false)}><X /></button>
        </div>

        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => { setPage(name); setMobileMenu(false); }}
            >
              <Icon size={18} /><span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className={`status-dot ${backendOK ? "online" : ""}`} />
          <span>{backendOK ? "Backend connected" : "Backend not connected"}</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileMenu(true)}><Menu /></button>
          <div className="breadcrumb">Workspace <span>/</span> {page}</div>
          <button className="secondary-button" onClick={() => { refresh(); refreshExtras(); }}>
            <RefreshCw size={15} /> Refresh data
          </button>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">FINPILOT INTELLIGENCE</div>
              <h1>{page}</h1>
              <p>{pageDescriptions[page]}</p>
            </div>
            <div className="date-chip">{today}</div>
          </div>

          {error && <div className="alert error"><AlertTriangle size={17} />{error}</div>}
          {notice && <div className="alert success"><Check size={17} />{notice}<button onClick={() => setNotice("")}>Dismiss</button></div>}

          {page === "Overview" && (
            <>
              <div className="hero">
                <div>
                  <span className="hero-tag"><Sparkles size={14} /> YOUR FINANCIAL COPILOT</span>
                  <h2>Make every rupee<br />more intentional.</h2>
                  <p>Capture expenses, build savings habits, and understand your spending — with you in control.</p>
                  <button className="primary-button" onClick={() => setPage("Expense capture")}>Capture an expense <Sparkles size={16} /></button>
                </div>
                <div className="hero-art"><Wallet size={78} strokeWidth={1.1} /><span>₹</span></div>
              </div>

              <div className="metrics-grid">
                <Metric label="Recorded spending" value={money(summary.total_spent)} foot="All saved transactions" icon={Wallet} />
                <Metric label="Transactions" value={summary.transaction_count} foot="Confirmed ledger entries" icon={ReceiptText} />
                <Metric label="Savings goals" value={goals.length} foot="Goals you have saved" icon={Target} />
              </div>

              <div className="two-columns">
                <section className="panel">
                  <PanelTitle title="Spending by category" subtitle="Based on your recorded transactions" />
                  {summary.by_category.length ? summary.by_category.map(item => (
                    <div className="category-row" key={item.category}>
                      <div className="row-between"><span>{item.category}</span><b>{money(item.amount)}</b></div>
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, item.amount / Math.max(1, summary.total_spent) * 100)}%` }} /></div>
                    </div>
                  )) : <Empty text="Your category breakdown will appear after you save transactions." />}
                </section>
                <section className="panel">
                  <PanelTitle title="Recent transactions" subtitle="Your latest confirmed expenses" />
                  <Ledger rows={transactions.slice(0, 5)} />
                  <button className="text-button" onClick={() => setPage("Ledger")}>View full ledger →</button>
                </section>
              </div>
            </>
          )}

          {page === "Expense capture" && (
            <section className="panel narrow-panel">
              <PanelTitle title="Describe your expense" subtitle="Natural language in, editable transaction draft out." />
              <label className="field-label">Expense description</label>
              <textarea rows="4" value={expenseText} onChange={e => setExpenseText(e.target.value)} placeholder="For example: I spent 180 rupees on an auto yesterday." />
              <div className="button-row">
                <button className="secondary-button" onClick={startVoice}><Mic size={16} /> Speak expense</button>
                <button className="primary-button" disabled={loading} onClick={() => captureExpense()}>
                  {loading ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Extract details
                </button>
              </div>
              {draft && <Draft draft={draft} update={updateDraft} save={() => saveTransaction(draft)} loading={loading} />}
            </section>
          )}

          {page === "Receipts" && (
            <section className="panel narrow-panel">
              <PanelTitle title="Receipt extraction" subtitle="Upload a text-based PDF or TXT, or paste receipt text." />
              <label className="upload-box">
                <ReceiptText size={28} />
                <b>Choose receipt file</b>
                <span>TXT or text-based PDF · Maximum 10 MB</span>
                <input type="file" accept=".txt,.pdf,image/*" onChange={e => uploadReceipt(e.target.files?.[0])} />
              </label>
              {receiptFileName && <p className="muted">Selected: {receiptFileName}</p>}
              <label className="field-label">Receipt text</label>
              <textarea rows="6" value={receiptText} onChange={e => setReceiptText(e.target.value)} placeholder={"Merchant: Example Store\nDate: 2026-10-28\nTotal: ₹450"} />
              <button className="primary-button" onClick={extractPastedReceipt} disabled={loading}>
                <Sparkles size={16} /> Extract receipt details
              </button>
              {draft && <Draft draft={draft} update={updateDraft} save={() => saveTransaction(draft)} loading={loading} />}
              <p className="muted">Scanned PDFs and images need an OCR provider, which is not configured in this version.</p>
            </section>
          )}

          {page === "Classify notes" && (
            <section className="panel">
              <PanelTitle title="Classify spending notes" subtitle="AI creates drafts; each transaction needs your confirmation." />
              <textarea rows="5" value={notes} onChange={e => setNotes(e.target.value)} placeholder={"Lunch 250 today at cafe\nBus ticket 80 yesterday\nGroceries 600 at local store"} />
              <button className="primary-button" disabled={loading || !notes.trim()} onClick={classifyNotes}>
                <Sparkles size={16} /> Classify notes
              </button>
              {noteDrafts.map((item, index) => (
                <div className="draft-card" key={`${item.source_text}-${index}`}>
                  <div className="row-between"><b>Draft {index + 1}</b><span className="status-pill">REVIEW REQUIRED</span></div>
                  <TransactionFields item={item} onChange={(key, value) => setNoteDrafts(old => old.map((d, i) => i === index ? { ...d, [key]: value } : d))} />
                  <button className="primary-button" onClick={() => saveNoteDraft(item, index)}><Check size={16} /> Confirm & save</button>
                  <button className="text-button" onClick={() => setNoteDrafts(old => old.filter((_, i) => i !== index))}>Discard draft</button>
                </div>
              ))}
              {unclassified.length > 0 && <div className="alert warning"><AlertTriangle size={16} /><div><b>Not converted</b>{unclassified.map((item, i) => <p key={i}>{item}</p>)}</div></div>}
            </section>
          )}

          {page === "Savings goals" && (
            <div className="two-columns">
              <section className="panel">
                <PanelTitle title="Plan a savings goal" subtitle="Describe the target in your own words." />
                <textarea rows="4" value={goalText} onChange={e => setGoalText(e.target.value)} />
                <button className="primary-button" disabled={loading} onClick={planGoal}><Sparkles size={16} /> Generate plan</button>
                {goalDraft && <div className="draft-card">
                  <span className="status-pill">PROPOSED PLAN</span>
                  <h2>{goalDraft.name}</h2>
                  <div className="goal-amount">{money(goalDraft.target_amount)}</div>
                  <p>{goalDraft.rationale}</p>
                  <p>Target date: <b>{goalDraft.target_date}</b></p>
                  <h3>Milestones</h3>
                  {(goalDraft.milestones || []).map((m, i) => <div className="milestone" key={i}><b>{m.title}</b><span>{m.due_date} · {money(m.target_amount)}</span></div>)}
                  <button className="primary-button" onClick={() => saveGoal(goalDraft)}><Check size={16} /> Confirm & save goal</button>
                </div>}
              </section>

              <section className="panel">
                <PanelTitle title="Create a goal manually" subtitle="Set the details yourself." />
                <form className="stack-form" onSubmit={createManualGoal}>
                  <label>Goal name<input required value={manualGoal.name} onChange={e => setManualGoal({ ...manualGoal, name: e.target.value })} /></label>
                  <label>Target amount (₹)<input required type="number" min="1" value={manualGoal.target_amount} onChange={e => setManualGoal({ ...manualGoal, target_amount: e.target.value })} /></label>
                  <label>Already saved (₹)<input type="number" min="0" value={manualGoal.current_amount} onChange={e => setManualGoal({ ...manualGoal, current_amount: e.target.value })} /></label>
                  <label>Target date<input required type="date" min={today} value={manualGoal.target_date} onChange={e => setManualGoal({ ...manualGoal, target_date: e.target.value })} /></label>
                  <button className="primary-button"><Plus size={16} /> Save goal</button>
                </form>
              </section>

              <section className="panel full-span">
                <PanelTitle title="Saved goals" subtitle="Progress based on the amounts you entered." />
                {goals.length ? goals.map(goal => {
                  const pct = Math.min(100, goal.current_amount / goal.target_amount * 100);
                  return <div className="goal-row" key={goal.id}>
                    <div className="row-between"><b>{goal.name}</b><b>{Math.round(pct)}%</b></div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                    <p>{money(goal.current_amount)} of {money(goal.target_amount)} · Due {goal.target_date}</p>
                  </div>;
                }) : <Empty text="Your saved goals will appear here." />}
              </section>
            </div>
          )}

          {page === "Budgets" && (
            <div className="two-columns">
              <section className="panel">
                <PanelTitle title="Set a category budget" subtitle="Budget changes are made only when you submit this form." />
                <form className="stack-form" onSubmit={saveBudget}>
                  <label>Category<select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
                  <label>Monthly limit (₹)<input required type="number" min="1" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} /></label>
                  <button className="primary-button"><Plus size={16} /> Save budget</button>
                </form>
              </section>
              <section className="panel">
                <PanelTitle title="Monthly budget status" subtitle="Compared with the spending summary available from your ledger." />
                {budgets.length ? budgets.map(budget => {
                  const spent = summary.by_category.find(x => x.category === budget.category)?.amount || 0;
                  const pct = spent / budget.monthly_limit * 100;
                  return <div className="category-row" key={budget.category}>
                    <div className="row-between"><span>{budget.category}</span><b>{money(spent)} / {money(budget.monthly_limit)}</b></div>
                    <div className="progress-track"><div className={`progress-fill ${pct > 100 ? "over" : ""}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                    <small>{pct > 100 ? "Over limit" : `${Math.round(pct)}% of limit`}</small>
                  </div>;
                }) : <Empty text="Set your first budget to see a comparison." />}
              </section>
            </div>
          )}

          {page === "Monthly insights" && (
            <section className="panel">
              <PanelTitle title="Monthly financial review" subtitle="AI-generated suggestions based on your confirmed transactions." />
              <div className="inline-form">
                <label>Month<input type="month" value={insightMonth} onChange={e => setInsightMonth(e.target.value)} /></label>
                <button className="primary-button" disabled={loading} onClick={generateInsights}><Sparkles size={16} /> Generate insights</button>
              </div>
              {insights && <>
                <div className="insight-summary"><span className="eyebrow">MONTHLY SUMMARY</span><h2>{money(insights.total_spent)}</h2><p>{insights.summary}</p><small>{insights.transaction_count} recorded transactions</small></div>
                <div className="two-columns">
                  <div><h3>Patterns noticed</h3><ul>{(insights.patterns || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  <div><h3>Suggested actions</h3><ul>{(insights.action_items || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                </div>
                <p className="muted">Suggestions are informational. They do not modify your records or budgets.</p>
              </>}
            </section>
          )}

          {page === "Ledger" && (
            <section className="panel">
              <div className="row-between"><PanelTitle title="Transaction ledger" subtitle={`${transactions.length} saved records`} /><button className="secondary-button" onClick={refresh}><RefreshCw size={15} /> Refresh</button></div>
              <Ledger rows={transactions} />
            </section>
          )}

          <footer>FinPilot · AI-assisted recordkeeping · You approve consequential changes.</footer>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, foot, icon: Icon }) {
  return <div className="metric-card"><div className="row-between"><span>{label}</span><Icon size={19} /></div><h2>{value}</h2><small>{foot}</small></div>;
}

function PanelTitle({ title, subtitle }) {
  return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function Empty({ text }) {
  return <div className="empty-state"><ReceiptText size={24} /><p>{text}</p></div>;
}

function TransactionFields({ item, onChange }) {
  return <div className="form-grid">
    <label>Amount (₹)<input type="number" min="0.01" step="0.01" value={item.amount} onChange={e => onChange("amount", e.target.value)} /></label>
    <label>Date<input type="date" value={item.transaction_date || ""} onChange={e => onChange("transaction_date", e.target.value)} /></label>
    <label>Merchant<input value={item.merchant || ""} onChange={e => onChange("merchant", e.target.value)} /></label>
    <label>Category<select value={item.category || "Other"} onChange={e => onChange("category", e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
    <label className="wide-field">Note<input value={item.note || ""} onChange={e => onChange("note", e.target.value)} /></label>
  </div>;
}

function Draft({ draft, update, save, loading }) {
  return <div className="draft-card">
    <div className="row-between"><b>Review extracted transaction</b><span className="status-pill">NOT SAVED</span></div>
    {draft.missing_fields?.length > 0 && <div className="alert warning">Please check missing fields: {draft.missing_fields.join(", ")}</div>}
    <TransactionFields item={draft} onChange={update} />
    <button className="primary-button" disabled={loading} onClick={save}><Check size={16} /> Confirm & save transaction</button>
  </div>;
}

function Ledger({ rows }) {
  if (!rows.length) return <Empty text="No transactions yet. Confirm an expense draft to populate your ledger." />;
  return <div className="table-wrap"><table>
    <thead><tr><th>Merchant / note</th><th>Category</th><th>Date</th><th className="right">Amount</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id}>
      <td><b>{row.merchant}</b><small>{row.note}</small></td>
      <td><span className="category-tag">{row.category}</span></td>
      <td>{row.transaction_date}</td>
      <td className="right amount">{money(row.amount)}</td>
    </tr>)}</tbody>
  </table></div>;
}

createRoot(document.getElementById("root")).render(<App />);