// =====================================================
// auth.js — 認証・セッション管理
// =====================================================

const SESSION_TOKEN_KEY = 'uchitore_session_token';
const DEVICE_ID_KEY     = 'uchitore_device_id';

// ── Firebase 初期化 ──────────────────────────────
function initFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
}
initFirebase();

const auth = firebase.auth();
const db   = firebase.firestore();

// ── デバイスID ────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' +
         Math.random().toString(36).substr(2, 8);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── セッション登録（ログイン時） ──────────────────
async function registerSession(uid) {
  const deviceId = getDeviceId();
  const token    = generateToken();

  const userSnap = await db.collection('users').doc(uid).get();
  const maxSessions = userSnap.data()?.maxConcurrentSessions ?? 1;

  const sessRef = db.collection('sessions').doc(uid);

  await db.runTransaction(async tx => {
    const doc     = await tx.get(sessRef);
    let   devices = doc.exists ? (doc.data().devices || []) : [];

    // 30日以上古いセッションを削除
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    devices = devices.filter(d => d.lastSeen > cutoff);

    // 同じデバイスの既存セッションを削除
    devices = devices.filter(d => d.deviceId !== deviceId);

    // 上限超えなら古い順に削除
    while (devices.length >= maxSessions) devices.shift();

    devices.push({
      deviceId,
      token,
      lastSeen:  Date.now(),
      userAgent: navigator.userAgent.substring(0, 120)
    });

    tx.set(sessRef, { devices, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  });

  localStorage.setItem(SESSION_TOKEN_KEY, token);
  return token;
}

// ── セッション検証（ページロード時） ─────────────
async function verifySession(uid) {
  const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!storedToken) return false;

  const deviceId = getDeviceId();

  try {
    const doc     = await db.collection('sessions').doc(uid).get();
    if (!doc.exists) return false;
    const devices = doc.data().devices || [];
    const mine    = devices.find(d =>
      d.deviceId === deviceId && d.token === storedToken
    );
    if (!mine) return false;

    // lastSeen を更新
    const updated = devices.map(d =>
      d.deviceId === deviceId ? { ...d, lastSeen: Date.now() } : d
    );
    doc.ref.update({ devices: updated }).catch(() => {});
    return true;
  } catch { return false; }
}

// ── セッション削除（ログアウト時） ────────────────
async function removeSession(uid) {
  const deviceId = getDeviceId();
  localStorage.removeItem(SESSION_TOKEN_KEY);
  try {
    const ref = db.collection('sessions').doc(uid);
    const doc = await ref.get();
    if (doc.exists) {
      const devices = (doc.data().devices || [])
        .filter(d => d.deviceId !== deviceId);
      await ref.update({ devices });
    }
  } catch {}
}

// ── サインアウト ──────────────────────────────────
async function signOutUser() {
  const user = auth.currentUser;
  if (user) await removeSession(user.uid);
  await auth.signOut();
  window.location.href = '/login.html';
}

// ── 認証ガード ────────────────────────────────────
// 使い方: const { user, userData } = await requireAuth();
function requireAuth(allowedRoles = ['user', 'admin']) {
  return new Promise(resolve => {
    const unsub = auth.onAuthStateChanged(async user => {
      unsub();
      if (!user) { redirect('/login.html'); return; }

      const valid = await verifySession(user.uid);
      if (!valid) {
        await auth.signOut();
        redirect('/login.html?msg=session_expired');
        return;
      }

      const snap     = await db.collection('users').doc(user.uid).get();
      const userData = snap.data() || {};

      if (!allowedRoles.includes(userData.role)) {
        redirect('/login.html?msg=unauthorized');
        return;
      }

      resolve({ user, userData });
    });
  });
}

function requireAdmin() {
  return requireAuth(['admin']);
}

// ── ユーティリティ ────────────────────────────────
function generateToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2) +
         Math.random().toString(36).substr(2) +
         Date.now().toString(36);
}

function redirect(url) {
  window.location.href = url;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}
