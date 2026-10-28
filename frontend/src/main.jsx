
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Wallet,
  Sparkles,
  ArrowUpRight,
  ReceiptText,
  CircleCheck,
  AlertTriangle,
  RefreshCw,
  LayoutDashboard,
  ListOrdered,
  ShieldCheck
} from 'lucide-react';
import './style.css';

// Render frontend environment variable:
// VITE_API_URL=https://your-actual-backend.onrender.com
// Local development falls back to the local FastAPI server.
const API = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

const categories = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Entertainment',
  'Travel',
  'Savings',
  'Other'
];

const money = n =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(n || 0);

async function readResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || `Request failed (${response.status})`);
  }

  throw new Error('The backend returned an unexpected response.');
}

function getErrorMessage(error, fallback) {
  if (error instanceof TypeError) {
    return 'Cannot reach the backend. Check the backend URL, service status, and CORS settings.';
  }

  return error?.message || fallback;
}

function App() {
  const [page, setPage] = useState('overview');
  const [text, setText] = useState(
    'Spent ₹250 on lunch at Cafe Niloufer today'
  );
  const [draft, setDraft] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total_spent: 0,
    transaction_count: 0,
    by_category: []
  });

  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [health, setHealth] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const [transactionsResponse, summaryResponse, healthResponse] =
        await Promise.all([
          fetch(`${API}/api/transactions`),
          fetch(`${API}/api/summary`),
          fetch(`${API}/api/health`)
        ]);

      if (
        !transactionsResponse.ok ||
        !summaryResponse.ok ||
        !healthResponse.ok
      ) {
        throw new Error('A backend request failed. Check the backend logs.');
      }

      const [transactions, summaryData] = await Promise.all([
        readResponse(transactionsResponse),
        readResponse(summaryResponse),
        readResponse(healthResponse)
      ]);

      setRows(transactions);
      setSummary(summaryData);
      setHealth(true);
      setError('');
    } catch (err) {
      setHealth(false);
      setError(
        getErrorMessage(
          err,
          'Could not load FinPilot data. Check your backend configuration.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setDraft(current => ({
      ...current,
      [key]: value,
      missing_fields: (current.missing_fields || []).filter(
        field => field !== key
      )
    }));
  }

  async function extract(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setDraft(null);

    if (!text.trim()) {
      setError('Enter an expense description before analyzing.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`${API}/api/transactions/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Expense extraction failed.'
        );
      }

      setDraft({
        ...data,
        amount: data.amount ?? '',
        transaction_date: data.transaction_date ?? '',
        merchant: data.merchant ?? '',
        note: data.note || text,
        source_text: text
      });

      setNotice('Draft extracted. Review every field before saving.');
    } catch (err) {
      setError(
        getErrorMessage(err, 'Expense extraction failed. Please retry.')
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError('');
    setNotice('');

    if (!draft) {
      setError('Analyze an expense first.');
      return;
    }

    if (
      !draft.amount ||
      !Number.isFinite(Number(draft.amount)) ||
      Number(draft.amount) <= 0 ||
      !draft.transaction_date ||
      !draft.merchant?.trim() ||
      !draft.note?.trim()
    ) {
      setError(
        'Amount, date, merchant and note are required. Complete the missing fields before saving.'
      );
      return;
    }

    const confirmed = window.confirm(
      `Save this transaction?\n\n` +
      `${money(Number(draft.amount))} · ${draft.merchant}\n` +
      `${draft.category || 'Other'} · ${draft.transaction_date}\n\n` +
      `Only save if these details are correct.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const response = await fetch(`${API}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          amount: Number(draft.amount),
          source_text: draft.source_text || text
        })
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Saving the transaction failed.'
        );
      }

      setNotice(`Saved successfully. Transaction ID: ${data.id}`);
      setDraft(null);

      await load();
      setPage('ledger');
    } catch (err) {
      setError(
        getErrorMessage(err, 'Could not save the transaction.')
      );
    } finally {
      setSaving(false);
    }
  }

  const maxCategory = Math.max(
    1,
    ...summary.by_category.map(item => Number(item.amount) || 0)
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wallet size={22} />
          </div>
          <div>
            <b>FinPilot</b>
            <small>PERSONAL FINANCE AI</small>
          </div>
        </div>

        <div className="navlabel">WORKSPACE</div>

        <button
          className={page === 'overview' ? 'nav active' : 'nav'}
          onClick={() => setPage('overview')}
        >
          <LayoutDashboard size={17} /> Overview
        </button>

        <button
          className={page === 'ledger' ? 'nav active' : 'nav'}
          onClick={() => setPage('ledger')}
        >
          <ListOrdered size={17} /> Transaction ledger
        </button>

        <div className="sidebottom">
          <ShieldCheck size={17} />
          <span>
            Privacy-first workflow
            <small>Review before saving</small>
          </span>
        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <div className="eyebrow">YOUR MONEY, MADE CLEAR</div>
            <h1>
              {page === 'overview'
                ? 'Financial overview'
                : 'Transaction ledger'}
            </h1>
            <p className="muted">
              Understand spending. Capture expenses. Make intentional decisions.
            </p>
          </div>

          <div className={health ? 'status' : 'status offline'}>
            <span /> {health ? 'API connected' : 'API unavailable'}
          </div>
        </header>

        {error && (
          <div className="alert error">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {notice && (
          <div className="alert success">
            <CircleCheck size={18} />
            <span>{notice}</span>
            <button onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        {page === 'overview' ? (
          <>
            <section className="stats">
              <div className="stat">
                <span>Total recorded spending</span>
                <strong>{money(summary.total_spent)}</strong>
                <small>Across saved transactions</small>
                <div className="staticon">
                  <Wallet size={18} />
                </div>
              </div>

              <div className="stat">
                <span>Transactions</span>
                <strong>{summary.transaction_count}</strong>
                <small>Saved to your ledger</small>
                <div className="staticon blue">
                  <ReceiptText size={18} />
                </div>
              </div>

              <div className="stat">
                <span>Categories used</span>
                <strong>{summary.by_category.length}</strong>
                <small>Based on recorded data</small>
                <div className="staticon violet">
                  <ListOrdered size={18} />
                </div>
              </div>
            </section>

            <section className="workgrid">
              <div className="panel composer">
                <div className="panelhead">
                  <div className="roundicon">
                    <Sparkles size={19} />
                  </div>
                  <div>
                    <h2>AI expense capture</h2>
                    <p>Describe a purchase naturally. AI prepares a draft.</p>
                  </div>
                  <span className="pill">GROQ AI</span>
                </div>

                <form onSubmit={extract}>
                  <label htmlFor="expense">What did you spend?</label>
                  <textarea
                    id="expense"
                    value={text}
                    onChange={event => setText(event.target.value)}
                    placeholder="Example: I paid ₹480 for groceries at Reliance Fresh yesterday."
                    rows="4"
                  />
                  <div className="hint">
                    Tip: include the amount, merchant and date if you know them.
                  </div>

                  <button className="primary" disabled={busy}>
                    {busy ? (
                      <RefreshCw className="spin" size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}
                    {busy ? 'Extracting details…' : 'Extract transaction'}
                  </button>
                </form>

                {draft && (
                  <div className="draft">
                    <div className="drafttitle">
                      <div>
                        <h3>Review extracted draft</h3>
                        <p>AI output is not saved until you confirm.</p>
                      </div>
                      <span className="reviewpill">REVIEW REQUIRED</span>
                    </div>

                    {draft.missing_fields?.length > 0 && (
                      <div className="alert warning">
                        <AlertTriangle size={17} />
                        <span>
                          Missing fields flagged: {draft.missing_fields.join(', ')}.
                          Fill them in; don't guess.
                        </span>
                      </div>
                    )}

                    <div className="fields">
                      <div>
                        <label>Amount (₹) *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={draft.amount}
                          onChange={event =>
                            update('amount', event.target.value)
                          }
                          placeholder="Required"
                        />
                      </div>

                      <div>
                        <label>Date *</label>
                        <input
                          type="date"
                          value={draft.transaction_date || ''}
                          onChange={event =>
                            update('transaction_date', event.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label>Merchant *</label>
                        <input
                          value={draft.merchant || ''}
                          onChange={event =>
                            update('merchant', event.target.value)
                          }
                          placeholder="Merchant name"
                        />
                      </div>

                      <div>
                        <label>Category</label>
                        <select
                          value={draft.category || 'Other'}
                          onChange={event =>
                            update('category', event.target.value)
                          }
                        >
                          {categories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="full">
                        <label>Note *</label>
                        <input
                          value={draft.note || ''}
                          onChange={event => update('note', event.target.value)}
                          placeholder="Short description"
                        />
                      </div>
                    </div>

                    <button
                      className="primary save"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving
                        ? 'Saving…'
                        : (
                          <>
                            <CircleCheck size={17} /> Confirm & save transaction
                          </>
                        )}
                    </button>
                  </div>
                )}
              </div>

              <div className="panel insights">
                <div className="panelhead">
                  <div className="roundicon bluebg">
                    <ArrowUpRight size={19} />
                  </div>
                  <div>
                    <h2>Spending by category</h2>
                    <p>Calculated from saved ledger entries</p>
                  </div>
                </div>

                {summary.by_category.length === 0 ? (
                  <div className="empty">
                    <div className="emptyicon">
                      <ReceiptText size={22} />
                    </div>
                    <b>No spending data yet</b>
                    <p>
                      Your category totals will appear after you save a transaction.
                    </p>
                  </div>
                ) : (
                  <div className="bars">
                    {summary.by_category
                      .slice()
                      .sort((a, b) => b.amount - a.amount)
                      .map(item => (
                        <div className="barrow" key={item.category}>
                          <div className="barlabel">
                            <span>{item.category}</span>
                            <b>{money(item.amount)}</b>
                          </div>
                          <div className="track">
                            <div
                              className="fill"
                              style={{
                                width: `${Math.max(
                                  2,
                                  (Number(item.amount) || 0) /
                                    maxCategory *
                                    100
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="secure-note">
                  <ShieldCheck size={16} />
                  <span>
                    Totals are based on database records, not AI estimates.
                  </span>
                </div>
              </div>
            </section>

            <section className="panel recent">
              <div className="sectionhead">
                <div>
                  <h2>Recent transactions</h2>
                  <p>Your latest saved expenses</p>
                </div>
                <button
                  className="textbtn"
                  onClick={() => setPage('ledger')}
                >
                  View ledger <ArrowUpRight size={15} />
                </button>
              </div>
              {loading ? (
                <p className="muted">Loading transactions…</p>
              ) : (
                <Ledger rows={rows.slice(0, 5)} />
              )}
            </section>
          </>
        ) : (
          <section className="panel recent">
            <div className="sectionhead">
              <div>
                <h2>All transactions</h2>
                <p>{rows.length} records saved in the database</p>
              </div>
              <button className="secondary" onClick={load} disabled={loading}>
                <RefreshCw size={15} /> {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {loading ? (
              <p className="muted">Loading transactions…</p>
            ) : (
              <Ledger rows={rows} />
            )}
          </section>
        )}

        <footer>
          FinPilot · AI-assisted recordkeeping · Always review AI-generated details before saving.
        </footer>
      </main>
    </div>
  );
}

function Ledger({ rows }) {
  if (!rows.length) {
    return (
      <div className="empty">
        <div className="emptyicon">
          <ReceiptText size={22} />
        </div>
        <b>No transactions yet</b>
        <p>
          Extract an expense and confirm it to create your first ledger entry.
        </p>
      </div>
    );
  }

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>MERCHANT / NOTE</th>
            <th>CATEGORY</th>
            <th>DATE</th>
            <th className="right">AMOUNT</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>
                <b>{row.merchant}</b>
                <small>{row.note}</small>
              </td>
              <td>
                <span className="cat">{row.category}</span>
              </td>
              <td>{row.transaction_date}</td>
              <td className="right amount">{money(row.amount)}</td>
              <td>
                <span className="saved">
                  <CircleCheck size={13} /> Saved
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
