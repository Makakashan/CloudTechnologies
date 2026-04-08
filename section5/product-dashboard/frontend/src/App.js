import React from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';

const API_BASE = '/api';

function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>Product Dashboard</h1>
        <nav style={styles.nav}>
          <NavItem to="/" end label="Home" />
          <NavItem to="/products" label="Products" />
          <NavItem to="/stats" label="Stats" />
        </nav>
      </header>

      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/products" element={<ProductsView />} />
          <Route path="/stats" element={<StatsView />} />
          <Route path="*" element={<NotFoundView />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        ...styles.navLink,
        ...(isActive ? styles.navLinkActive : {}),
      })}
    >
      {label}
    </NavLink>
  );
}

function HomeView() {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Welcome</h2>
      <p>
        This demo dashboard shows a React frontend integrated with a Node.js/Express API.
      </p>
      <ul style={styles.list}>
        <li>Browse and add products in the Products view.</li>
        <li>Check aggregated metrics and backend instance in the Stats view.</li>
      </ul>
    </section>
  );
}

function ProductsView() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const [form, setForm] = React.useState({
    name: '',
    price: '',
    category: '',
  });

  const fetchItems = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/items`);
      if (!response.ok) {
        throw new Error(`Failed to load items (${response.status})`);
      }

      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unexpected error while loading products.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'General',
    };

    if (form.price !== '') {
      const parsedPrice = Number(form.price);
      if (Number.isNaN(parsedPrice)) {
        setError('Price must be a number.');
        return;
      }
      payload.price = parsedPrice;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const maybeError = await safeJson(response);
        const message =
          maybeError?.error || `Failed to create product (${response.status})`;
        throw new Error(message);
      }

      const created = await response.json();
      setItems((prev) => [...prev, created]);

      setForm({
        name: '',
        price: '',
        category: '',
      });
    } catch (err) {
      setError(err.message || 'Unexpected error while creating product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={styles.grid}>
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Add Product</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Name *
            <input
              style={styles.input}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Mechanical Keyboard"
            />
          </label>

          <label style={styles.label}>
            Price
            <input
              style={styles.input}
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="e.g. 299.99"
            />
          </label>

          <label style={styles.label}>
            Category
            <input
              style={styles.input}
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Electronics"
            />
          </label>

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? 'Saving...' : 'Add Product'}
          </button>
        </form>

        {error ? <p style={styles.error}>{error}</p> : null}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Products</h2>

        {loading ? (
          <p>Loading products...</p>
        ) : items.length === 0 ? (
          <p>No products available yet.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.id}</td>
                    <td style={styles.td}>{item.name}</td>
                    <td style={styles.td}>{item.category || 'General'}</td>
                    <td style={styles.td}>
                      {item.price === null || item.price === undefined
                        ? '-'
                        : String(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button type="button" style={styles.secondaryButton} onClick={fetchItems}>
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}

function StatsView() {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [lastCacheStatus, setLastCacheStatus] = React.useState('-');

  const loadStats = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Add a cache-busting query so consecutive refreshes can hit different backend instances.
      const response = await fetch(`${API_BASE}/stats?requestId=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load stats (${response.status})`);
      }

      const data = await response.json();
      setStats(data);
      setLastCacheStatus(response.headers.get('X-Cache-Status') || '-');
    } catch (err) {
      setError(err.message || 'Unexpected error while loading stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>Statistics</h2>

      {loading ? (
        <p>Loading statistics...</p>
      ) : error ? (
        <p style={styles.error}>{error}</p>
      ) : (
        <div style={styles.statsWrap}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Total Products</div>
            <div style={styles.statValue}>{stats?.totalProducts ?? '-'}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Backend Instance ID</div>
            <div style={styles.statValueSmall}>{stats?.instanceId ?? '-'}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Timestamp</div>
            <div style={styles.statValueSmall}>{stats?.timestamp ?? '-'}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Server Uptime</div>
            <div style={styles.statValueSmall}>{formatUptime(stats?.uptime)}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Requests Handled</div>
            <div style={styles.statValue}>{stats?.requestsHandled ?? '-'}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Server Time</div>
            <div style={styles.statValueSmall}>{stats?.serverTime ?? '-'}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>Nginx Cache Status</div>
            <div style={styles.statValueSmall}>{lastCacheStatus}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <button type="button" style={styles.secondaryButton} onClick={loadStats}>
          Reload stats
        </button>
      </div>
    </section>
  );
}

function NotFoundView() {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>404 - Page not found</h2>
      <p>The requested route does not exist. Use the navigation above.</p>
    </section>
  );
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (_err) {
    return null;
  }
}

function formatUptime(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

const styles = {
  app: {
    minHeight: '100vh',
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    background: '#f4f7fb',
    color: '#1f2937',
  },
  header: {
    background: '#111827',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: '1.4rem',
  },
  nav: {
    display: 'flex',
    gap: 8,
  },
  navLink: {
    color: '#c7d2fe',
    textDecoration: 'none',
    padding: '8px 10px',
    borderRadius: 8,
    fontWeight: 500,
  },
  navLinkActive: {
    background: '#374151',
    color: '#fff',
  },
  main: {
    maxWidth: 1050,
    margin: '24px auto',
    padding: '0 16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.2fr',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 18,
    boxShadow: '0 4px 16px rgba(17, 24, 39, 0.06)',
  },
  sectionTitle: {
    marginTop: 0,
  },
  form: {
    display: 'grid',
    gap: 10,
  },
  label: {
    display: 'grid',
    gap: 6,
    fontWeight: 500,
    fontSize: 14,
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 4,
    padding: '10px 14px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  secondaryButton: {
    padding: '8px 12px',
    background: '#e5e7eb',
    color: '#111827',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: {
    marginTop: 10,
    color: '#b91c1c',
    fontWeight: 600,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    borderBottom: '1px solid #e5e7eb',
    padding: '8px 6px',
    fontSize: 13,
    color: '#6b7280',
  },
  td: {
    borderBottom: '1px solid #f3f4f6',
    padding: '8px 6px',
    fontSize: 14,
  },
  list: {
    marginTop: 10,
  },
  statsWrap: {
    display: 'grid',
    gap: 10,
  },
  statBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 12,
    background: '#fafafa',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
  },
  statValueSmall: {
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    wordBreak: 'break-all',
  },
};

export default App;
