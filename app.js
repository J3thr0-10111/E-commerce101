/* ==========================================================================
   FEUGO APPAREL — v2 (simple/static edition)
   No Firebase, no login, no database. Products are hardcoded right below —
   edit the PRODUCTS array to add, remove, or change items. Each product's
   "image" must exactly match a filename inside images/products/.
   Cart is stored in the browser (localStorage). Checkout opens WhatsApp
   with the order pre-filled — there is no server, no payment processing.
   ========================================================================== */

const WHATSAPP_NUMBER = "27638518362";
const IMAGE_BASE = "images/products/";

// ─── PRODUCT CATALOG ───────────────────────────────────────────────────────
// To add a product: drop the photo into images/products/, then add an
// entry here with the exact filename. To remove a product, delete its entry.
const PRODUCTS = [
  { id: "1", name: "Doberman Head Tee",   colorway: "White",  price: 370, image: "doberman-white.jpg",       onSale: false, salePct: 0  },
  { id: "2", name: "Zebra Drop Tee",      colorway: "Black",  price: 370, image: "zebra-drop-black.jpg",      onSale: true,  salePct: 20 },
  { id: "3", name: "Zebra Drop Tee",      colorway: "White",  price: 370, image: "zebra-drop-white.jpg",      onSale: false, salePct: 0  },
  { id: "4", name: "Never Average Tee",   colorway: "Orange", price: 370, image: "never-average-orange.jpg",  onSale: false, salePct: 0  },
  { id: "5", name: "Never Average Tee",   colorway: "Mint",   price: 370, image: "never-average-mint.jpg",    onSale: false, salePct: 0  },
  { id: "6", name: "Feugo 25 Jersey Tee", colorway: "Black",  price: 350, image: "feugo25-black.jpg",         onSale: true,  salePct: 15 },
  { id: "7", name: "Puffs & Kisses Tee",  colorway: "Black",  price: 320, image: "puffs-kisses-black.jpg",    onSale: false, salePct: 0  },
  { id: "8", name: "Puffs & Kisses Tee",  colorway: "White",  price: 370, image: "puffs-kisses-white.jpg",    onSale: false, salePct: 0  },
  { id: "9", name: "Never Average Tee",   colorway: "Mint",   price: 360, image: "never-average-mint.jpg",    onSale: false, salePct: 0  },
  { id: "10", name: "Feugo 25 Jersey Tee", colorway: "Black",  price: 370, image: "feugo25-black.jpg",         onSale: true,  salePct: 15 },
  { id: "11", name: "Puffs & Kisses Tee",  colorway: "Black",  price: 350, image: "puffs-kisses-black.jpg",    onSale: false, salePct: 0  },
  { id: "12", name: "Puffs & Kisses Tee",  colorway: "White",  price: 320, image: "puffs-kisses-white.jpg",    onSale: false, salePct: 0  },

];

let cart = loadCart();

/* ─── UTIL ─── */
function imgSrc(filename) {
  return IMAGE_BASE + filename;
}

// Inline SVG shown if a product's image file is missing, so a typo in the
// filename above doesn't break the layout with a broken-image icon.
const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#1a1a1a"/>
  <text x="50%" y="50%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#666">No Image</text>
</svg>`);

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

/* ─── SHOP RENDER ─── */
function renderShop() {
  const grid = document.getElementById('shopProducts');
  const count = document.getElementById('product-count');

  if (!PRODUCTS.length) {
    grid.innerHTML = `<div class="empty-state"><span class="stamp">Nothing here yet</span>New drop loading soon. Check back.</div>`;
    if (count) count.textContent = '';
    return;
  }

  if (count) count.textContent = `${PRODUCTS.length} item${PRODUCTS.length !== 1 ? 's' : ''}`;

  grid.innerHTML = PRODUCTS.map(p => {
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

/* ─── CART (localStorage) ─── */
window.addToCart = (id) => {
  const p = PRODUCTS.find(x => x.id === id);
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

/* ─── CHECKOUT (WhatsApp) ─── */
document.getElementById('checkoutBtn').onclick = () => {
  if (!cart.length) return showToast('Your bag is empty');

  const name = document.getElementById('ck-name').value.trim();
  const phone = document.getElementById('ck-phone').value.trim();
  if (!name || !phone) return showToast('Add your name and WhatsApp number');

  const total = cart.reduce((s, i) => s + lineTotal(i), 0);
  const itemsList = cart.map(i => `• ${i.name}${i.colorway ? ' (' + i.colorway + ')' : ''} x${i.qty} — ${money(lineTotal(i))}`).join('%0A');
  const msg = `🔥 *FEUGO ORDER*%0A%0AName: ${encodeURIComponent(name)}%0AItems:%0A${itemsList}%0A%0A*Total: ${money(total)}*`;

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  cart = [];
  saveCart();
  renderCart();
  updateBagBadge();
  showToast('✅ Order sent! Opening WhatsApp…');
  setTimeout(() => showView('landing'), 1200);
};

/* ─── INIT ─── */
renderShop();
renderCart();
updateBagBadge();
showView('landing');
