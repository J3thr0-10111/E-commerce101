import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==========================================================================
   FEUGO APPAREL — v2
   Firebase is used for staff Admin only: auth (login) + Firestore (product
   & order data). There is no Firebase Storage — product photos live in the
   local /images/products/ folder and are referenced by filename below.
   Everyone else browses and buys with no account required.
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyCAfNXzeQduCnk2GEpyeGY3615DhkwGqIU",
  authDomain: "fuego-6ccb1.firebaseapp.com",
  projectId: "fuego-6ccb1",
  storageBucket: "fuego-6ccb1.firebasestorage.app",
  messagingSenderId: "731836686580",
  appId: "1:731836686580:web:65589cdef6a4e540327ea1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "admin@feugo.com";
const WHATSAPP_NUMBER = "27638518362";
const IMAGE_BASE = "images/products/";

// Add new filenames here after dropping the image into images/products/
const PRODUCT_IMAGES = [
  "doberman-white.jpg",
  "zebra-drop-black.jpg",
  "zebra-drop-white.jpg",
  "never-average-orange.jpg",
  "never-average-mint.jpg",
  "feugo25-black.jpg",
  "puffs-kisses-black.jpg",
  "puffs-kisses-white.jpg",
];

// Fallback catalog shown until/unless staff add real inventory in Admin.
// Firestore products (once added) render alongside these automatically.
const SEED_PRODUCTS = [
  { id: "seed-1", name: "Doberman Head Tee", colorway: "White", price: 479, image: "doberman-white.jpg", onSale: false, salePct: 0 },
  { id: "seed-2", name: "Zebra Drop Tee", colorway: "Black", price: 529, image: "zebra-drop-black.jpg", onSale: true, salePct: 20 },
  { id: "seed-3", name: "Zebra Drop Tee", colorway: "White", price: 529, image: "zebra-drop-white.jpg", onSale: false, salePct: 0 },
  { id: "seed-4", name: "Never Average Tee", colorway: "Orange", price: 459, image: "never-average-orange.jpg", onSale: false, salePct: 0 },
  { id: "seed-5", name: "Never Average Tee", colorway: "Mint", price: 459, image: "never-average-mint.jpg", onSale: false, salePct: 0 },
  { id: "seed-6", name: "Feugo 25 Jersey Tee", colorway: "Black", price: 549, image: "feugo25-black.jpg", onSale: true, salePct: 15 },
  { id: "seed-7", name: "Puffs & Kisses Tee", colorway: "Black", price: 499, image: "puffs-kisses-black.jpg", onSale: false, salePct: 0 },
  { id: "seed-8", name: "Puffs & Kisses Tee", colorway: "White", price: 499, image: "puffs-kisses-white.jpg", onSale: false, salePct: 0 },
];

let products = [];
let firestoreProducts = [];
let cart = loadCart();
let isAdmin = false;

/* ─── UTIL ─── */
function imgSrc(filename) {
  if (!filename) return "";
  return filename.startsWith("http") ? filename : IMAGE_BASE + filename;
}

// True only if the image is a full URL, or a filename known to exist in
// images/products/ (i.e. listed in PRODUCT_IMAGES). Anything else means
// the file is missing from the repo, so we keep it out of the shop rather
// than showing a broken image.
function hasValidImage(filename) {
  if (!filename) return false;
  if (filename.startsWith("http")) return true;
  return PRODUCT_IMAGES.includes(filename);
}

// Inline SVG shown whenever a product image file can't be found (e.g. the
// filename stored in Firestore doesn't match a file in images/products/).
// This keeps the layout intact instead of showing a broken-image icon.
const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#1a1a1a"/>
  <text x="50%" y="47%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#666">No Image</text>
  <text x="50%" y="57%" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#555">Check filename in Admin</text>
</svg>`);

// Adds an onerror fallback to any <img> tag string so a missing file
// swaps to FALLBACK_IMG instead of breaking the layout.
function imgTag(src, alt, extraAttrs = '') {
  return `<img src="${src}" alt="${alt}" ${extraAttrs} onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">`;
}

function money(n) { return `R${Math.round(n)}`; }

function showToast(msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2900);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('feugo_cart') || '[]'); }
  catch { return []; }
}
function saveCart() { localStorage.setItem('feugo_cart', JSON.stringify(cart)); }

/* ─── NAVIGATION ─── */
const showView = (id) => {
  document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.querySelectorAll('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.getAttribute('data-view')));
});
document.getElementById('nav-logo').onclick = () => showView('landing');

/* ─── ADMIN IMAGE PICKER ─── */
const imgSelect = document.getElementById('p-image');
PRODUCT_IMAGES.forEach(f => {
  const opt = document.createElement('option');
  opt.value = f;
  opt.textContent = f;
  imgSelect.appendChild(opt);
});
imgSelect.addEventListener('change', () => {
  const preview = document.getElementById('p-image-preview');
  if (imgSelect.value) {
    preview.onerror = () => { preview.onerror = null; preview.src = FALLBACK_IMG; };
    preview.src = imgSrc(imgSelect.value);
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
});

/* ─── AUTH WATCHER (staff / admin only) ─── */
onAuthStateChanged(auth, (user) => {
  isAdmin = !!user && user.email === ADMIN_EMAIL;

  document.getElementById('nav-admin').style.display = isAdmin ? 'inline-block' : 'none';
  document.getElementById('nav-logout').style.display = user ? 'inline-block' : 'none';

  if (user && !isAdmin) {
    // A non-staff account somehow signed in — this app has no public accounts.
    signOut(auth);
    showToast('This login is for FEUGO staff only.');
  } else if (isAdmin) {
    showToast('🔥 Welcome back, staff.');
    showView('admin-view');
  }
});

/* ─── STAFF LOGIN ─── */
document.getElementById('authBtn').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const pass = document.getElementById('pass').value;
  if (!email || !pass) return showToast('Enter email and password');

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    showToast('Sign-in failed: ' + e.message);
  }
};

document.getElementById('nav-logout').onclick = () =>
  signOut(auth).then(() => { showView('landing'); showToast('Signed out'); });

/* ─── ADMIN CRUD ─── */
document.getElementById('cancelEditBtn').onclick = resetForm;

function resetForm() {
  document.getElementById('p-id').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-colorway').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-on-sale').value = 'false';
  document.getElementById('p-sale-pct').value = '';
  imgSelect.value = '';
  document.getElementById('p-image-preview').style.display = 'none';
  document.getElementById('admin-form-title').textContent = 'Add Product';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

document.getElementById('saveProductBtn').onclick = async () => {
  if (!isAdmin) return showToast('Staff sign-in required');

  const id = document.getElementById('p-id').value;
  const name = document.getElementById('p-name').value.trim();
  const colorway = document.getElementById('p-colorway').value.trim();
  const price = Number(document.getElementById('p-price').value);
  const onSale = document.getElementById('p-on-sale').value === 'true';
  const salePct = Number(document.getElementById('p-sale-pct').value) || 0;
  const image = imgSelect.value;

  if (!name || !price) return showToast('Name and price are required');
  if (!image) return showToast('Choose a product image');

  const data = { name, colorway, price, onSale, salePct, image, timestamp: Date.now() };

  try {
    if (id) await updateDoc(doc(db, "products", id), data);
    else await addDoc(collection(db, "products"), data);
    showToast('✅ Product saved');
    resetForm();
  } catch (e) {
    showToast('Error: ' + e.message);
  }
};

window.editProduct = (id) => {
  const p = firestoreProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('p-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-colorway').value = p.colorway || '';
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-on-sale').value = String(!!p.onSale);
  document.getElementById('p-sale-pct').value = p.salePct || '';
  imgSelect.value = p.image || '';
  imgSelect.dispatchEvent(new Event('change'));
  document.getElementById('admin-form-title').textContent = 'Edit Product';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async (id) => {
  if (confirm('Delete this product?')) {
    await deleteDoc(doc(db, "products", id));
    showToast('🗑️ Product deleted');
  }
};

/* ─── DATA SYNC (Firestore products merge with local seed catalog) ─── */
onSnapshot(collection(db, "products"), (snap) => {
  firestoreProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const source = firestoreProducts.length ? firestoreProducts : SEED_PRODUCTS;
  // Shop only shows products whose image file actually exists — products
  // with a missing/broken image are hidden from customers instead of
  // showing a broken picture. They still appear in Admin (see
  // renderAdminList) so staff can fix or delete them.
  products = source.filter(p => hasValidImage(p.image));
  renderShop();
  renderAdminList();
}, () => {
  // offline / no Firestore access — still show the catalog
  products = SEED_PRODUCTS.filter(p => hasValidImage(p.image));
  renderShop();
});

try {
  const ordersQuery = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(20));
  onSnapshot(ordersQuery, (snap) => {
    renderAdminOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
} catch { /* rules may block reads for non-staff; admin list stays empty */ }

/* ─── SHOP RENDER ─── */
function renderShop() {
  const grid = document.getElementById('shopProducts');
  const count = document.getElementById('product-count');

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state"><span class="stamp">Nothing here yet</span>New drop loading soon. Check back.</div>`;
    if (count) count.textContent = '';
    return;
  }

  if (count) count.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;

  grid.innerHTML = products.map(p => {
    const salePrice = p.onSale && p.salePct ? Math.round(p.price * (1 - p.salePct / 100)) : null;
    return `
    <div class="card">
      ${p.onSale ? `<div class="sale-ribbon">Sale</div>` : ''}
      <div class="card-img-wrap">
        ${imgTag(imgSrc(p.image), `${p.name} — ${p.colorway || ''}`, 'loading="lazy"')}
        <div class="card-overlay">
          <button class="card-add-btn" onclick="addToCart('${p.id}')">+ Add to Bag</button>
        </div>
      </div>
      <div class="tape-tag ${salePrice ? 'sale' : ''}">
        ${salePrice ? `<span class="strike">${money(p.price)}</span>${money(salePrice)}` : money(p.price)}
      </div>
      <div class="card-info">
        <p class="card-name">${p.name}</p>
        ${p.colorway ? `<p class="card-colorway">${p.colorway}</p>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ─── CART (guest, localStorage) ─── */
window.addToCart = (id) => {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ ...p, qty: 1 });
  saveCart();
  renderCart();
  updateBagBadge();
  showToast(`🛍️ ${p.name} added to bag`);
};

function updateBagBadge() {
  const badge = document.getElementById('bag-count');
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);
  if (totalQty > 0) {
    badge.style.display = 'flex';
    badge.textContent = totalQty;
  } else {
    badge.style.display = 'none';
  }
}

function lineTotal(item) {
  const unit = item.onSale && item.salePct ? Math.round(item.price * (1 - item.salePct / 100)) : item.price;
  return unit * item.qty;
}

function renderCart() {
  const container = document.getElementById('cartItems');
  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛍️</div>
        <p>Your bag is empty</p>
        <button class="btn-primary" data-view="shop">Browse Collection</button>
      </div>`;
    container.querySelector('[data-view]').onclick = () => showView('shop');
    document.getElementById('cartTotal').textContent = 'R0';
    return;
  }

  container.innerHTML = cart.map((item, i) => {
    const unit = item.onSale && item.salePct ? Math.round(item.price * (1 - item.salePct / 100)) : item.price;
    return `
    <div class="cart-item">
      ${imgTag(imgSrc(item.image), item.name)}
      <div>
        <p class="cart-item-name">${item.name}</p>
        ${item.colorway ? `<p class="cart-item-colorway">${item.colorway}</p>` : ''}
        <p class="cart-item-price">${money(unit)}</p>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
      </div>
      <button class="cart-remove" onclick="removeFromCart(${i})">Remove</button>
    </div>`;
  }).join('');

  const total = cart.reduce((s, i) => s + lineTotal(i), 0);
  document.getElementById('cartTotal').textContent = money(total);
}

window.changeQty = (i, delta) => {
  cart[i].qty += delta;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  saveCart();
  renderCart();
  updateBagBadge();
};

window.removeFromCart = (i) => {
  const name = cart[i].name;
  cart.splice(i, 1);
  saveCart();
  renderCart();
  updateBagBadge();
  showToast(`Removed ${name}`);
};

/* ─── GUEST CHECKOUT ─── */
document.getElementById('checkoutBtn').onclick = async () => {
  if (!cart.length) return showToast('Your bag is empty');

  const name = document.getElementById('ck-name').value.trim();
  const phone = document.getElementById('ck-phone').value.trim();
  if (!name || !phone) return showToast('Add your name and WhatsApp number');

  const total = cart.reduce((s, i) => s + lineTotal(i), 0);
  const itemsList = cart.map(i => `• ${i.name}${i.colorway ? ' (' + i.colorway + ')' : ''} x${i.qty} — ${money(lineTotal(i))}`).join('%0A');
  const msg = `🔥 *FEUGO ORDER*%0A%0AName: ${encodeURIComponent(name)}%0AItems:%0A${itemsList}%0A%0A*Total: ${money(total)}*`;

  const orderData = {
    name, phone,
    items: cart.map(i => ({ name: i.name, colorway: i.colorway || '', qty: i.qty, price: i.price })),
    total,
    timestamp: Date.now(),
    status: 'pending'
  };

  try { await addDoc(collection(db, "orders"), orderData); }
  catch (e) { console.warn('Order log skipped:', e.message); }

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  cart = [];
  saveCart();
  renderCart();
  updateBagBadge();
  showToast('✅ Order sent! Opening WhatsApp…');
  setTimeout(() => showView('landing'), 1200);
};

/* ─── ADMIN LISTS ─── */
function renderAdminList() {
  const list = document.getElementById('adminProductList');
  if (!firestoreProducts.length) {
    list.innerHTML = `<div style="padding:24px;color:var(--muted);font-size:0.85rem;">No products in Firestore yet — the shop is showing the sample catalog below. Add a product to replace it.</div>`;
    return;
  }
  list.innerHTML = firestoreProducts.map(p => `
    <div class="admin-item">
      ${imgTag(imgSrc(p.image), '')}
      <span class="admin-item-name">${p.name}${p.colorway ? ' — ' + p.colorway : ''}${!hasValidImage(p.image) ? ' <span style="color:#e03131;font-weight:600;">(hidden — missing image)</span>' : ''}</span>
      <span class="admin-item-price">${money(p.price)}</span>
      <span class="badge-sale">${p.onSale ? p.salePct + '% off' : '—'}</span>
      <span style="display:flex;gap:6px;">
        <button class="btn-edit" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn-delete" onclick="deleteProduct('${p.id}')">Del</button>
      </span>
    </div>
  `).join('');
}

function renderAdminOrders(orders) {
  const wrap = document.getElementById('adminOrdersList');
  if (!wrap) return;
  if (!orders.length) {
    wrap.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;">No orders yet.</p>`;
    return;
  }
  wrap.innerHTML = orders.map(o => `
    <div class="order-row">
      <div class="order-row-top">
        <span><strong>${o.name || 'Guest'}</strong> · ${o.phone || '—'}</span>
        <span class="order-total">${money(o.total || 0)}</span>
      </div>
      <div class="order-items">${(o.items || []).map(i => `${i.name}${i.colorway ? ' (' + i.colorway + ')' : ''} x${i.qty}`).join(', ')}</div>
      <div class="order-id">${o.timestamp ? new Date(o.timestamp).toLocaleString() : ''}</div>
    </div>
  `).join('');
}

/* ─── INIT ─── */
renderCart();
updateBagBadge();
showView('landing');
