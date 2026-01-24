import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// YOUR API CONFIGURATION
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

let products = [];
let cart = [];
let isLoginMode = true;

// --- NAVIGATION ---
const showView = (id) => {
    document.querySelectorAll('.view').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    window.scrollTo(0,0);
};

document.querySelectorAll('[data-view]').forEach(btn => {
    btn.onclick = () => showView(btn.getAttribute('data-view'));
});

document.getElementById('nav-logo').onclick = () => showView('landing');

// --- AUTH WATCHER ---
onAuthStateChanged(auth, (user) => {
    const loggedIn = !!user;
    ['nav-shop', 'nav-cart', 'nav-orders', 'nav-logout'].forEach(id => {
        document.getElementById(id).style.display = loggedIn ? 'block' : 'none';
    });
    document.getElementById('nav-login').style.display = loggedIn ? 'none' : 'block';
    document.getElementById('nav-admin').style.display = (user && user.email === 'admin@fuego.com') ? 'block' : 'none';
});

// --- AUTH LOGIC ---
document.getElementById('authBtn').onclick = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    if(!email || !pass) return alert("Fill all fields");

    try {
        if(isLoginMode) await signInWithEmailAndPassword(auth, email, pass);
        else await createUserWithEmailAndPassword(auth, email, pass);
        showView('shop');
    } catch(e) { alert(e.message); }
};

document.getElementById('toggleAuth').onclick = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? 'Login' : 'Create Account';
    document.getElementById('toggleAuth').innerText = isLoginMode ? 'Create Account' : 'Back to Login';
};

document.getElementById('nav-logout').onclick = () => signOut(auth).then(() => showView('landing'));

// --- ADMIN CRUD ---
document.getElementById('saveProductBtn').onclick = async () => {
    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value;
    const price = Number(document.getElementById('p-price').value);
    const onSale = document.getElementById('p-on-sale').value === 'true';
    const salePct = document.getElementById('p-sale-pct').value;
    const file = document.getElementById('p-file').files[0];

    let data = { name, price, onSale, salePct, timestamp: Date.now() };

    if(file) {
        const sRef = ref(storage, `products/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(sRef, file);
        data.image = await getDownloadURL(snap.ref);
    }

    if(id) await updateDoc(doc(db, "products", id), data);
    else await addDoc(collection(db, "products"), data);
    
    alert("Saved!");
    location.reload(); 
};

window.deleteProduct = async (id) => {
    if(confirm("Delete product?")) await deleteDoc(doc(db, "products", id));
};

// --- DATA SYNC & RENDERING ---
onSnapshot(collection(db, "products"), (snap) => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderShop();
    renderAdminList();
});

function renderShop() {
    document.getElementById('shopProducts').innerHTML = products.map(p => `
        <div class="card">
            ${p.onSale ? `<div class="sale-badge">SALE ${p.salePct}%</div>` : ''}
            <img src="${p.image || 'https://via.placeholder.com/300'}">
            <div class="card-info">
                <h4>${p.name}</h4>
                <p>$${p.price}</p>
                <button class="btn-primary" onclick="addToCart('${p.id}')">Add to Bag</button>
            </div>
        </div>
    `).join('');
}

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    cart.push(p);
    renderCart();
    alert("Added!");
};

function renderCart() {
    document.getElementById('cartItems').innerHTML = cart.map((item, i) => `
        <div class="admin-item">
            <span>${item.name} - $${item.price}</span>
            <button onclick="removeFromCart(${i})">Remove</button>
        </div>
    `).join('');
    const total = cart.reduce((s,i) => s + i.price, 0);
    document.getElementById('cartTotal').innerText = `Total: R${total}`;
}

window.removeFromCart = (i) => {
    cart.splice(i, 1);
    renderCart();
};

document.getElementById('checkoutBtn').onclick = async () => {
    if(!cart.length) return;
    const total = cart.reduce((s,i) => s + i.price, 0);
    const orderData = { userId: auth.currentUser.uid, items: cart, total, timestamp: Date.now() };
    await addDoc(collection(db, "orders"), orderData);
    window.open(`https://wa.me/27638518362?text=Order Total: R ${total} add description`);
    cart = [];
    showView('landing');
};

function renderAdminList() {
    document.getElementById('adminProductList').innerHTML = products.map(p => `
        <div class="admin-item">
            <span>${p.name}</span>
            <button onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
    `).join('');
}

showView('landing');
