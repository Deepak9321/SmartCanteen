let cart = []; try { cart = JSON.parse(localStorage.getItem('smartCanteenCart') || '[]'); if (!Array.isArray(cart)) cart = [] } catch (e) { cart = [] }
function saveCart() { localStorage.setItem('smartCanteenCart', JSON.stringify(cart)); updateCartUI() }
function cartCount() { return cart.reduce((s, i) => s + i.quantity, 0) }
function cartTotal() { return cart.reduce((s, i) => s + i.price * i.quantity, 0) }
function toast(s) { const t = document.getElementById('toast'); if (!t) return; t.textContent = s; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200) }
function foodImage(name) {
    const slug = String(name || 'food').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return '/images/food/' + slug + '.jpg';
}
function add(foodId, name, price, image) {
    const safeImage = foodImage(name);
    const x = cart.find(i => i.foodId === foodId);
    if (x) {
        x.quantity++;
        x.image = safeImage;
    } else {
        cart.push({ foodId, name, price: Number(price), image: safeImage, quantity: 1 });
    }
    saveCart();
    toast(name + ' added · ' + cartCount() + ' item(s)');
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function updateCartUI() { const count = document.getElementById('navCartCount'); if (count) { count.textContent = cartCount() ? cartCount() : ''; count.classList.toggle('show', cartCount() > 0) } const empty = document.getElementById('cartEmpty'), content = document.getElementById('cartContent'); if (!empty || !content) return; if (!cart.length) { empty.classList.remove('hidden'); content.classList.add('hidden'); return } empty.classList.add('hidden'); content.classList.remove('hidden'); const box = document.getElementById('cartItems'); if (box) box.innerHTML = cart.map((i, idx) => `<article class="cart-item"><div class="cart-item-icon"><img src="${escapeHtml(foodImage(i.name))}" alt="${escapeHtml(i.name)}" onerror="this.onerror=null;this.src='/images/food/default.svg';"></div><div class="cart-item-main"><h4>${escapeHtml(i.name)}</h4><small>₹${i.price} each</small><div class="qty"><button onclick="changeQty(${idx},-1)">−</button><b>${i.quantity}</b><button onclick="changeQty(${idx},1)">+</button></div></div><div class="cart-item-price"><b>₹${i.price * i.quantity}</b><button class="remove-link" onclick="removeCart(${idx})">Remove</button></div></article>`).join(''); const c = document.getElementById('cartItemCount'); if (c) c.textContent = cartCount(); const sub = document.getElementById('cartSubtotal'); if (sub) sub.textContent = '₹' + cartTotal(); const total = document.getElementById('cartTotal'); if (total) total.textContent = '₹' + cartTotal() }
function changeQty(idx, delta) { if (!cart[idx]) return; cart[idx].quantity += delta; if (cart[idx].quantity <= 0) cart.splice(idx, 1); saveCart() }
function removeCart(idx) { cart.splice(idx, 1); saveCart(); toast('Item removed') }
function clearCart() { cart = []; saveCart(); toast('Cart cleared') }
function showCartSummary() { let old = document.getElementById('cartFloat'); if (old) old.remove(); if (!cart.length) return; const el = document.createElement('div'); el.id = 'cartFloat'; el.innerHTML = `<div><b>🛒 ${cartCount()} items</b><span>₹${cartTotal()}</span></div><a class="primary" href="/student/cart">View cart</a>`; document.body.appendChild(el) }
function openDeliveryFromCart() { if (!cart.length) return toast('Your cart is empty'); placeOrder() }
function placeOrder() { if (!cart.length) return; const input = document.getElementById('deliveryDate'), modal = document.getElementById('deliveryModal'); if (!input || !modal) return location.href = '/student/cart'; const now = new Date(), today = now.toISOString().slice(0, 10), tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1); input.min = today; input.max = tomorrow.toISOString().slice(0, 10); input.value = today; const time = document.getElementById('deliveryTime'); if (time) time.value = '10:00 - 10:30'; updateDeliverySummary(); modal.classList.remove('hidden') }
function hideDelivery() { document.getElementById('deliveryModal')?.classList.add('hidden') }
function updateDeliverySummary() { const d = document.getElementById('deliveryDate')?.value, t = document.getElementById('deliveryTime')?.value, s = document.getElementById('deliverySummary'); if (s) s.textContent = d && t ? ('Selected: ' + d + ' · ' + t) : 'Select a slot' }
document.addEventListener('change', e => { if (e.target.id === 'deliveryDate' || e.target.id === 'deliveryTime') updateDeliverySummary() });
async function continueToPayment() {
    if (!cart.length) { toast('Your cart is empty'); return; }
    const deliveryDate = document.getElementById('deliveryDate')?.value;
    const deliveryTime = document.getElementById('deliveryTime')?.value;
    const err = document.getElementById('deliveryError');
    const btn = document.querySelector('#deliveryModal .primary.wide');
    if (!deliveryDate || !deliveryTime) {
        if (err) err.textContent = 'Please select both date and time.';
        return;
    }
    if (btn?.disabled) return;
    if (err) err.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Processing order…'; }
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ items: cart, deliveryDate, deliveryTime })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            if (err) err.textContent = data.error || 'Could not place order. Please try again.';
            return;
        }
        if (!data.paymentUrl) {
            if (err) err.textContent = 'Order was created but payment link was not returned. Open My Orders and try again.';
            return;
        }
        cart = [];
        saveCart();
        window.location.assign(data.paymentUrl);
    } catch (error) {
        if (err) err.textContent = 'Connection problem. Please check your internet and try again.';
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Continue to Payment →'; }
    }
}
function payOrder(id) { location.href = '/payment/' + id }
function showQR(src, title) { const img = document.getElementById('qrImage'); if (img) img.src = src; const q = document.getElementById('qrTitle'); if (q) q.textContent = title; document.getElementById('qrModal')?.classList.remove('hidden') }
function hideQR() { document.getElementById('qrModal')?.classList.add('hidden') }
function filterFood(cat, btn) { document.querySelectorAll('.filter').forEach(x => x.classList.remove('active')); btn?.classList.add('active'); document.querySelectorAll('.food').forEach(x => x.style.display = (cat === 'all' || x.dataset.category === cat) ? 'block' : 'none') }
const search = document.getElementById('search'); if (search) search.addEventListener('input', e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('.food').forEach(x => x.style.display = x.dataset.name.includes(q) ? 'block' : 'none') });
async function sendFeedback() { const orderId = document.getElementById('fbOrder')?.value; if (!orderId) return toast('Select an order'); const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, rating: document.getElementById('fbRating').value, comment: document.getElementById('fbComment').value }) }); toast(r.ok ? 'Feedback saved' : 'Could not save feedback'); if (r.ok) setTimeout(() => location.reload(), 500) }
document.addEventListener('DOMContentLoaded', () => { updateCartUI(); showCartSummary() });
function initFoodTilt() { document.querySelectorAll('.food').forEach(card => { card.addEventListener('pointermove', e => { if (window.innerWidth < 900) return; const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; card.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-7px)` }); card.addEventListener('pointerleave', () => card.style.transform = '') }) }
document.addEventListener('DOMContentLoaded', initFoodTilt);
