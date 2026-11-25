import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const SERVICES = ['catalog', 'inventory', 'orders'];

const money = (value) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const date = (value) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function StatusBar() {
  const [status, setStatus] = useState({});

  useEffect(() => {
    const check = () => {
      SERVICES.forEach((service) => {
        api.health(service)
          .then((result) =>
            setStatus((previous) => ({
              ...previous,
              [service]: result.status === 'ok',
            })),
          )
          .catch(() =>
            setStatus((previous) => ({
              ...previous,
              [service]: false,
            })),
          );
      });
    };

    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="service-status">
      <span className="status-heading">SYSTEM STATUS</span>
      {SERVICES.map((service) => (
        <span className="service-item" key={service}>
          <i className={`status-dot ${
            status[service] === undefined
              ? 'pending'
              : status[service] ? 'online' : 'offline'
          }`} />
          <span>{service}</span>
        </span>
      ))}
    </div>
  );
}

function Sidebar({ active, onNavigate }) {
  const navigation = [
    { name: 'Overview', icon: '◫' },
    { name: 'Products', icon: '▦' },
    { name: 'Inventory', icon: '▤' },
    { name: 'Orders', icon: '↗' },
  ];

  return (
    <aside className="sidebar">
      <a className="brand" href="#" onClick={(e) => {
        e.preventDefault();
        onNavigate('Overview');
      }}>
        <span className="brand-mark">S</span>
        <span>shop<span>lite</span><small>COMMERCE CONTROL</small></span>
      </a>

      <div className="nav-label">WORKSPACE</div>
      <nav className="navigation">
        {navigation.map((item) => (
          <button
            key={item.name}
            className={`nav-item ${active === item.name ? 'active' : ''}`}
            onClick={() => onNavigate(item.name)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.name}
            {active === item.name && <span className="nav-arrow">›</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-promo">
          <span className="promo-icon">✳</span>
          <strong>Everything in control.</strong>
          <p>Your commerce operations, beautifully organized.</p>
          <span className="promo-tag">SHOPLITE 2.0</span>
        </div>
        <div className="profile">
          <div className="avatar">SL</div>
          <div>
            <strong>ShopLite Admin</strong>
            <span>Administrator</span>
          </div>
          <span className="profile-menu">···</span>
        </div>
      </div>
    </aside>
  );
}

function MetricCard({ label, value, detail, icon, accent }) {
  return (
    <article className={`metric-card ${accent || ''}`}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function Products({ products, search }) {
  const filtered = products.filter((product) =>
    `${product.name} ${product.id}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="panel inventory-panel" id="products">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PRODUCT CATALOG</span>
          <h2>Product inventory</h2>
          <p>Manage your products and monitor available stock.</p>
        </div>
        <span className="count-badge">{products.length} PRODUCTS</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>PRODUCT ID</th>
              <th>UNIT PRICE</th>
              <th>AVAILABLE STOCK</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, index) => {
              const stock = Number(product.stock ?? 0);
              return (
                <tr key={product.id}>
                  <td>
                    <div className="product-cell">
                      <div className={`product-symbol symbol-${index % 3}`}>
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                      <strong>{product.name}</strong>
                    </div>
                  </td>
                  <td className="muted-cell">#{String(product.id).padStart(4, '0')}</td>
                  <td className="price-cell">{money(product.price)}</td>
                  <td>
                    <div className="stock-cell">
                      <strong>{stock}</strong>
                      <div className="stock-track">
                        <span style={{ width: `${Math.min(stock * 2, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`stock-badge ${
                      stock === 0 ? 'out' : stock <= 5 ? 'low' : 'available'
                    }`}>
                      <i />
                      {stock === 0 ? 'Out of stock' : stock <= 5 ? 'Low stock' : 'In stock'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="empty-state">No matching products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Showing {filtered.length} of {products.length} products</span>
        <span>Live inventory data <i className="status-dot online" /></span>
      </div>
    </section>
  );
}

function OrderForm({ products, onOrdered }) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = products.find(
    (product) => product.id === Number(productId || products[0]?.id),
  );

  const total = Number(selected?.price || 0) * Number(quantity || 0);

  const submit = async (event) => {
    event.preventDefault();
    if (!selected || Number(quantity) < 1) return;

    if (Number(quantity) > Number(selected.stock ?? 0)) {
      setMessage({ type: 'error', text: 'Requested quantity exceeds available stock.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const order = await api.createOrder(Number(selected.id), Number(quantity));
      setMessage({
        type: 'success',
        text: `Order #${order.id} placed successfully. Total: ${money(order.total)}`,
      });
      setQuantity(1);
      await onOrdered();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel order-panel" id="new-order">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">QUICK TRANSACTION</span>
          <h2>Create an order</h2>
          <p>Place a new order directly from your inventory.</p>
        </div>
        <span className="order-icon">↗</span>
      </div>

      <form onSubmit={submit} className="order-form">
        <label>
          SELECT PRODUCT
          <select
            value={productId || products[0]?.id || ''}
            onChange={(event) => {
              setProductId(event.target.value);
              setMessage(null);
            }}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {money(product.price)}
              </option>
            ))}
          </select>
        </label>

        <label>
          QUANTITY
          <input
            type="number"
            min="1"
            max={selected?.stock ?? 1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>

        <div className="order-summary">
          <span>ORDER TOTAL</span>
          <strong>{money(total)}</strong>
        </div>

        <button
          className="submit-order"
          type="submit"
          disabled={!selected || submitting || Number(selected.stock ?? 0) < 1}
        >
          {submitting ? 'Processing order...' : 'Place order'}
          <span>↗</span>
        </button>
      </form>

      {message && (
        <div className={`order-message ${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '!'}</span>
          {message.text}
        </div>
      )}

      <div className="secure-note">↗ &nbsp; Inventory is reserved automatically when an order succeeds.</div>
    </section>
  );
}

function Orders({ orders, products }) {
  const productName = (id) =>
    products.find((product) => product.id === id)?.name || `Product #${id}`;

  return (
    <section className="panel orders-panel" id="orders">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">TRANSACTION HISTORY</span>
          <h2>Recent orders</h2>
          <p>A record of your latest customer transactions.</p>
        </div>
        <span className="count-badge">{orders.length} ORDERS</span>
      </div>

      {orders.length === 0 ? (
        <div className="empty-orders">
          <span>↗</span>
          <strong>No orders yet</strong>
          <p>Your completed orders will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>PRODUCT</th>
                <th>QUANTITY</th>
                <th>TOTAL AMOUNT</th>
                <th>DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="order-id">#{String(order.id).padStart(4, '0')}</td>
                  <td><strong>{productName(order.productId)}</strong></td>
                  <td>{order.quantity}</td>
                  <td className="price-cell">{money(order.total)}</td>
                  <td className="muted-cell">{date(order.createdAt)}</td>
                  <td><span className="stock-badge available"><i /> Completed</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('Overview');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await api.products();
      const withStock = await Promise.all(
        list.map((product) =>
          api.stock(product.id)
            .then((stock) => ({ ...product, stock: stock.quantity }))
            .catch(() => ({ ...product, stock: 0 })),
        ),
      );

      setProducts(withStock);
      setOrders(await api.orders());
      setError('');
    } catch (err) {
      setError(`Unable to load dashboard: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => ({
    units: products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    value: products.reduce(
      (sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0),
      0,
    ),
    revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
  }), [products, orders]);

  const navigate = (name) => {
    setActive(name);
    const target = {
      Overview: 'overview',
      Products: 'products',
      Inventory: 'products',
      Orders: 'orders',
    }[name];
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app-shell">
      <Sidebar active={active} onNavigate={navigate} />

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">WORKSPACE <span>/</span> <strong>{active}</strong></div>
          <div className="topbar-right">
            <StatusBar />
            <button
              className="refresh-button"
              onClick={load}
              disabled={refreshing}
              title="Refresh dashboard"
            >
              <span className={refreshing ? 'spin' : ''}>↻</span>
              Refresh
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-section">
            <div>
              <span className="eyebrow"><span className="welcome-dot" /> YOUR COMMERCE OVERVIEW</span>
              <h1>Good to see you.<br /><span>Here's your business at a glance.</span></h1>
              <p>Monitor your products, inventory and orders from one place.</p>
            </div>
            <div className="date-chip">◷ &nbsp; {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}</div>
          </section>

          {error && <div className="error-banner">⚠ &nbsp; {error}</div>}

          <section className="metrics-grid">
            <MetricCard label="TOTAL PRODUCTS" value={products.length} detail="Active catalog items" icon="▦" />
            <MetricCard label="AVAILABLE UNITS" value={metrics.units.toLocaleString()} detail="Across all products" icon="▤" accent="lime-card" />
            <MetricCard label="INVENTORY VALUE" value={money(metrics.value)} detail="Current stock valuation" icon="◈" />
            <MetricCard label="TOTAL REVENUE" value={money(metrics.revenue)} detail={`${orders.length} completed orders`} icon="↗" accent="revenue-card" />
          </section>

          <div className="content-grid">
            <Products products={products} search={search} />
            <OrderForm products={products} onOrdered={load} />
          </div>

          <section className="panel search-panel">
            <div className="search-control">
              <Icon>⌕</Icon>
              <input
                type="search"
                placeholder="Search products by name or ID..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <span>LIVE INVENTORY</span>
          </section>

          <Orders orders={orders} products={products} />

          <footer className="footer">
            <div className="footer-brand"><span className="brand-mark small">S</span> SHOPLITE <span>2.0</span></div>
            <span>Built for better commerce operations.</span>
            <span className="footer-status"><i className="status-dot online" /> SYSTEM OPERATIONAL</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
