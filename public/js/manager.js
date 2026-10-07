function toast(s) { const t = document.getElementById('toast'); t.textContent = s; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200) }
async function refreshForecast() { const r = await fetch('/api/forecast'); if (r.ok) { toast('AI forecast refreshed and saved to forecasts collection'); setTimeout(() => location.reload(), 700) } else toast('Forecast refresh failed') }
async function changeStatus(id, status) { if (!status) return; const r = await fetch('/api/orders/' + id + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); toast(r.ok ? 'Order status updated' : 'Update failed'); if (r.ok) setTimeout(() => location.reload(), 500) }
async function saveFood(id, name, price, category, stock) { const r = await fetch('/api/manager/food', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name, price, category, stock: Number(stock) }) }); toast(r.ok ? 'Inventory saved' : 'Could not save') }
function toggleWaste() { document.getElementById('wasteForm').classList.toggle('hidden') }
async function addWaste() { const body = { foodName: document.getElementById('wFood').value, prepared: Number(document.getElementById('wPrepared').value), sold: Number(document.getElementById('wSold').value), unsold: Number(document.getElementById('wUnsold').value), unsoldKg: Number(document.getElementById('wKg').value) }; const r = await fetch('/api/manager/waste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); toast(r.ok ? 'Waste record saved' : 'Could not save'); if (r.ok) setTimeout(() => location.reload(), 500) }

let qrScanner = null;
async function startScanner() {
  const box = document.getElementById('qr-reader');
  if (!window.Html5Qrcode) { toast('QR scanner library could not load. Use Upload QR image.'); return }
  if (qrScanner) return;
  qrScanner = new Html5Qrcode('qr-reader');
  try {
    await qrScanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, onQrScanned, () => { });
    toast('Camera scanner started');
  } catch (e) { qrScanner = null; toast('Camera permission denied or camera unavailable. Try QR image upload.'); }
}
async function stopScanner() { if (!qrScanner) return; try { await qrScanner.stop(); } catch (e) { } try { qrScanner.clear(); } catch (e) { } qrScanner = null }
async function scanQRImage(file) {
  if (!file || !window.Html5Qrcode) return;
  await stopScanner();
  const tempId = 'qr-file-reader';
  let temp = document.getElementById(tempId); if (!temp) { temp = document.createElement('div'); temp.id = tempId; temp.className = 'hidden'; document.body.appendChild(temp) }
  const scanner = new Html5Qrcode(tempId);
  try { const text = await scanner.scanFile(file, true); await scanner.clear(); onQrScanned(text); } catch (e) { try { await scanner.clear() } catch (_) { } toast('Could not read a QR code from that image.'); }
}
async function onQrScanned(decodedText) {
  await stopScanner();
  let payload;
  try { payload = JSON.parse(decodedText) } catch (e) { return toast('Invalid Smart Canteen QR'); }
  if (payload.app !== 'Smart Canteen' || !payload.orderId) return toast('This QR is not a Smart Canteen pickup QR');
  const r = await fetch('/api/manager/orders/' + payload.orderId); const d = await r.json();
  if (!r.ok) return toast(d.error || 'Order not found');
  renderScanResult(d, payload);
}
function renderScanResult(d, payload) {
  const o = d.order, s = d.student, p = d.payment;
  const items = o.items.map(i => `<div class="scan-item"><span>${escapeHtml(i.name)} × ${i.quantity}</span><b>₹${i.price * i.quantity}</b></div>`).join('');
  document.getElementById('scanResult').innerHTML = `<div class="scan-card"><div class="scan-top"><span class="badge green">QR verified</span><span class="tag ${o.status === 'Picked Up' ? 'purple' : 'amber'}">${escapeHtml(o.status)}</span></div><h3>Token #${o.token}</h3><p class="muted">Order ${o._id.toString().slice(-8).toUpperCase()} · ${escapeHtml(o.pickupCounter || 'Counter')} · 🕒 ${escapeHtml(o.deliveryDate || 'Today')} ${escapeHtml(o.deliveryTime || 'ASAP')}</p><div class="scan-student"><b>${escapeHtml(s?.name || o.studentName || 'Student')}</b><small>${escapeHtml(s?.studentId || '')} ${s?.email ? '· ' + escapeHtml(s.email) : ''}</small></div><div class="scan-items">${items}</div><div class="scan-total"><span>Total</span><b>₹${o.total}</b></div><div class="scan-payment"><span>Payment</span><b>${p?.status || 'Not found'} · ${escapeHtml(p?.method || '')}</b></div><div class="scan-actions">${o.status !== 'Picked Up' && o.status !== 'Cancelled' ? `<button class="primary" onclick="markScannedPickedUp('${o._id}')">✓ Verify & Mark Picked Up</button>` : ''}<button class="outline" onclick="clearScanResult()">Scan another</button></div></div>`;
}
async function markScannedPickedUp(id) { const r = await fetch('/api/orders/' + id + '/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Picked Up' }) }); const d = await r.json(); if (!r.ok) return toast(d.error || 'Could not update order'); toast('Order verified and marked Picked Up'); document.querySelector('#scanResult .scan-actions').innerHTML = '<span class="tag green">✓ Pickup completed</span><button class="outline" onclick="clearScanResult()">Scan another</button>' }
function clearScanResult() { document.getElementById('scanResult').innerHTML = '<div class="empty">No QR scanned yet.</div>' }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])) }
function initFoodTilt() { document.querySelectorAll('.inventory-card').forEach(card => { card.addEventListener('pointermove', e => { if (window.innerWidth < 900) return; const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; card.style.transform = `perspective(800px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-4px)` }); card.addEventListener('pointerleave', () => card.style.transform = '') }) }
document.addEventListener('DOMContentLoaded', initFoodTilt);
