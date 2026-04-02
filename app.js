import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);

const WHATSAPP_NUMBER = "27638518362";

let products = [];
let cart = [];
let isLoginMode = true;

// ─── TOAST ───
function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

// ─── NAVIGATION ───
const showView = (id) => {
    document.querySelectorAll('.view').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => showView(btn.getAttribute('data-view'));
});

document.getElementById('nav-logo').onclick = () => showView('landing');

// ─── AUTH WATCHER ───
onAuthStateChanged(auth, (user) => {
    const loggedIn = !!user;
    ['nav-shop', 'nav-cart', 'nav-orders', 'nav-logout'].forEach(id => {
        document.getElementById(id).style.display = loggedIn ? 'block' : 'none';
    });
    document.getElementById('nav-login').style.display = loggedIn ? 'none' : 'block';
    document.getElementById('nav-admin').style.display =
        (user && user.email === 'admin@fuego.com') ? 'block' : 'none';

    if (loggedIn) showToast(`🔥 Welcome back!`);
});

// ─── AUTH LOGIC ───
document.getElementById('authBtn').onclick = async () => {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value;
    if (!email || !pass) return showToast('Please fill all fields');

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, pass);
        } else {
            await createUserWithEmailAndPassword(auth, email, pass);
        }
        showView('shop');
    } catch (e) {
        showToast(e.message);
    }
};

document.getElementById('toggleAuth').onclick = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? 'Login' : 'Create Account';
    document.getElementById('toggleAuth').innerText = isLoginMode
        ? "Don't have an account? Create one →"
        : "Already have an account? Login →";
    document.querySelector('.auth-subtitle').innerText = isLoginMode
        ? 'Access your FEUGO account'
        : 'Join the FEUGO movement';
};

document.getElementById('nav-logout').onclick = () =>
    signOut(auth).then(() => { showView('landing'); showToast('Signed out'); });

// ─── ADMIN CRUD ───
document.getElementById('saveProductBtn').onclick = async () => {
    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value.trim();
    const price = Number(document.getElementById('p-price').value);
    const onSale = document.getElementById('p-on-sale').value === 'true';
    const salePct = document.getElementById('p-sale-pct').value;
    const file = document.getElementById('p-file').files[0];

    if (!name || !price) return showToast('Name and price are required');

    let data = { name, price, onSale, salePct, timestamp: Date.now() };

    if (file) {
        const sRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(sRef, file);
        data.image = await getDownloadURL(snap.ref);
    }

    try {
        if (id) await updateDoc(doc(db, "products", id), data);
        else await addDoc(collection(db, "products"), data);
        showToast('✅ Product saved!');
        document.getElementById('p-name').value = '';
        document.getElementById('p-price').value = '';
        document.getElementById('p-sale-pct').value = '';
        document.getElementById('p-id').value = '';
    } catch (e) {
        showToast('Error: ' + e.message);
    }
};

window.deleteProduct = async (id) => {
    if (confirm("Delete this product?")) {
        await deleteDoc(doc(db, "products", id));
        showToast('🗑️ Product deleted');
    }
};

// ─── DATA SYNC & RENDERING ───
onSnapshot(collection(db, "products"), (snap) => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderShop();
    renderAdminList();
});

function renderShop() {
    const grid = document.getElementById('shopProducts');
    const count = document.getElementById('product-count');

    if (!products.length) {
        grid.innerHTML = `<div style="padding:80px 0;text-align:center;color:var(--muted);font-family:'Barlow Condensed',sans-serif;letter-spacing:0.1em;font-size:1.1rem;">No products yet. Check back soon.</div>`;
        if (count) count.textContent = '';
        return;
    }

    if (count) count.textContent = `${products.length} item${products.length !== 1 ? 's' : ''}`;

    grid.innerHTML = products.map(p => {
        const salePrice = p.onSale && p.salePct
            ? Math.round(p.price * (1 - p.salePct / 100))
            : null;

        return `
        <div class="card">
            <div class="card-img-wrap">
                ${p.onSale ? `<div class="sale-badge">SALE ${p.salePct}% OFF</div>` : ''}
                <img src="${p.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80'}" alt="${p.name}" loading="lazy">
                <div class="card-overlay">
                    <button class="card-add-btn" onclick="addToCart('${p.id}')">Add to Bag</button>
                </div>
            </div>
            <div class="card-info">
                <p class="card-name">${p.name}</p>
                <div class="card-price-wrap">
                    <span class="card-price">${salePrice ? `R${salePrice}` : `R${p.price}`}</span>
                    ${salePrice ? `<span class="card-price-orig">R${p.price}</span>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    cart.push(p);
    renderCart();
    updateCartBadge();
    showToast(`🛍️ ${p.name} added to bag`);
};

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    if (cart.length > 0) {
        badge.style.display = 'flex';
        badge.textContent = cart.length;
    } else {
        badge.style.display = 'none';
    }
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (!cart.length) {
        container.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛍️</div>
                <p>Your bag is empty</p>
                <button class="btn-primary" data-view="shop" onclick="showView('shop')">Browse Collection</button>
            </div>`;
        document.getElementById('cartTotal').textContent = 'R0';
        return;
    }

    container.innerHTML = cart.map((item, i) => `
        <div class="cart-item">
            <img src="${item.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&q=80'}" alt="${item.name}">
            <div class="cart-item-info">
                <p class="cart-item-name">${item.name}</p>
                <p class="cart-item-price">R${item.price}</p>
            </div>
            <button class="cart-remove" onclick="removeFromCart(${i})">Remove</button>
        </div>
    `).join('');

    const total = cart.reduce((s, i) => s + i.price, 0);
    document.getElementById('cartTotal').textContent = `R${total}`;
}

window.removeFromCart = (i) => {
    const name = cart[i].name;
    cart.splice(i, 1);
    renderCart();
    updateCartBadge();
    showToast(`Removed ${name}`);
};

document.getElementById('checkoutBtn').onclick = async () => {
    if (!cart.length) return showToast('Your bag is empty');
    if (!auth.currentUser) return showToast('Please login first');

    const total = cart.reduce((s, i) => s + i.price, 0);
    const itemsList = cart.map(i => `• ${i.name} (R${i.price})`).join('%0A');
    const msg = `🔥 *FEUGO ORDER*%0A%0AItems:%0A${itemsList}%0A%0A*Total: R${total}*%0AEmail: ${auth.currentUser.email}`;

    const orderData = {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        items: cart.map(i => ({ name: i.name, price: i.price })),
        total,
        timestamp: Date.now(),
        status: 'pending'
    };

    await addDoc(collection(db, "orders"), orderData);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    cart = [];
    renderCart();
    updateCartBadge();
    showToast('✅ Order placed! Opening WhatsApp...');
    setTimeout(() => showView('landing'), 1200);
};

function renderAdminList() {
    document.getElementById('adminProductList').innerHTML = products.map(p => `
        <div class="admin-item">
            <span>${p.name} — R${p.price}</span>
            <button class="btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
    `).join('');
}

// ─── INIT ───
showView('landing');

