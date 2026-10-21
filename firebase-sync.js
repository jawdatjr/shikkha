// Ashik Shikkha Firebase backend (browser module, CDN; no private service key).
// Offline receipt saves remain in index.html localStorage until this module can sync.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {
  getFirestore, doc, collection, getDocFromServer, getDocsFromServer,
  query, orderBy, documentId, startAfter, limit, Timestamp,
  runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAukX0HkLFcoOApsbHaoNdYf7H1CRjjnjo",
  authDomain: "shikkha-31810.firebaseapp.com",
  projectId: "shikkha-31810",
  storageBucket: "shikkha-31810.firebasestorage.app",
  messagingSenderId: "662454826786",
  appId: "1:662454826786:web:17fbd652150ac62ef5177b",
  measurementId: "G-KTC2J6PWBY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const CURSOR_KEY = 'ashik_firebase_events_cursor_v1';
let member = null;
let memberError = '';
const listeners = new Set();
let currentCheck = Promise.resolve();

function notify() {
  listeners.forEach(fn => {
    try { fn(member, memberError); } catch (err) { console.warn('Firebase status listener', err); }
  });
}
async function getActiveMember(user) {
  const snapshot = await getDocFromServer(doc(db, 'members', user.uid));
  const data = snapshot.exists() ? snapshot.data() : null;
  if (!data || data.active !== true || !['owner', 'salesman'].includes(data.role) || !data.displayName) {
    throw new Error('এই অ্যাকাউন্টের Firebase members অনুমতি নেই। Owner-কে UID দিয়ে members ডকুমেন্ট তৈরি করতে হবে।');
  }
  return { uid: user.uid, displayName: String(data.displayName), role: data.role };
}
function updateMember(nextMember, error = '') {
  member = nextMember;
  memberError = error;
  notify();
}
onAuthStateChanged(auth, user => {
  currentCheck = (async () => {
    if (!user) { updateMember(null); return; }
    try {
      updateMember(await getActiveMember(user));
    } catch (err) {
      updateMember(null, err.message || String(err));
    }
  })();
});

async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const nextMember = await getActiveMember(credential.user);
  updateMember(nextMember);
  return nextMember;
}
async function logOut() {
  await signOut(auth);
  updateMember(null);
}

function readCursor() {
  try {
    const saved = JSON.parse(localStorage.getItem(CURSOR_KEY) || 'null');
    if (saved && Number.isInteger(saved.seconds) && Number.isInteger(saved.nanos) &&
        typeof saved.id === 'string') return saved;
  } catch (_) {}
  return null;
}
function ackCursor(cursor) {
  if (cursor && Number.isInteger(cursor.seconds) && Number.isInteger(cursor.nanos) &&
      typeof cursor.id === 'string') localStorage.setItem(CURSOR_KEY, JSON.stringify(cursor));
}
function resetCursor() { localStorage.removeItem(CURSOR_KEY); }
function validEvent(e) {
  return e && typeof e.id === 'string' && e.id.length <= 128 &&
    typeof e.entityId === 'string' && e.entityId.length <= 128 &&
    ['receipt', 'expense'].includes(e.entity) &&
    ['upsert', 'delete'].includes(e.action) &&
    (e.base === null || typeof e.base === 'string') &&
    e.payload && typeof e.payload === 'object' && !Array.isArray(e.payload) &&
    e.payload._syncId === e.entityId;
}

async function appendEvent(e) {
  if (!validEvent(e)) throw new Error('Invalid local sync event: ' + (e && e.id));
  const eventRef = doc(db, 'events', e.id);
  const headRef = doc(db, 'heads', e.entity + ':' + e.entityId);
  return runTransaction(db, async tx => {
    // All reads before any write: retries are safe and idempotent.
    const existingEvent = await tx.get(eventRef);
    const previous = await tx.get(headRef);
    if (existingEvent.exists()) {
      if (existingEvent.data().actorUid !== auth.currentUser.uid) {
        throw new Error('Sync event ID already belongs to another user.');
      }
      return { applied: true };
    }
    const expected = previous.exists() ? previous.data().headId : null;
    if (expected !== e.base) {
      return { applied: false, conflict: { id: e.id, entity: e.entity, entityId: e.entityId, expected } };
    }
    const stampedEvent = {
      entity: e.entity, entityId: e.entityId, headKey: e.entity + ':' + e.entityId, action: e.action, payload: e.payload,
      base: e.base, clientAt: String(e.clientAt || ''), actorUid: member.uid,
      actor: member.displayName, serverAt: serverTimestamp()
    };
    tx.set(eventRef, stampedEvent);
    tx.set(headRef, {
      entity: e.entity, entityId: e.entityId, headId: e.id, base: e.base,
      actorUid: member.uid, updatedAt: serverTimestamp()
    });
    return { applied: true };
  }, { maxAttempts: 5 });
}

async function fetchEvents() {
  // Small paged reads prevent a giant single query from exhausting a mobile connection.
  const pageSize = 200;
  const maxPages = 4;
  const events = [];
  let cursor = readCursor();
  let hasMore = false;
  for (let page = 0; page < maxPages; page++) {
    const constraints = [orderBy('serverAt'), orderBy(documentId())];
    if (cursor) constraints.push(startAfter(new Timestamp(cursor.seconds, cursor.nanos), cursor.id));
    constraints.push(limit(pageSize));
    const results = await getDocsFromServer(query(collection(db, 'events'), ...constraints));
    if (results.empty) { hasMore = false; break; }
    results.docs.forEach(snapshot => {
      const data = snapshot.data();
      if (!data.serverAt) return;
      const { serverAt, ...rest } = data;
      events.push({ id: snapshot.id, ...rest, serverAt: serverAt.toDate().toISOString() });
    });
    const last = results.docs[results.docs.length - 1];
    const stamp = last.data().serverAt;
    if (!stamp) throw new Error('Firebase event timestamp not ready.');
    cursor = { seconds: stamp.seconds, nanos: stamp.nanoseconds, id: last.id };
    hasMore = results.size === pageSize;
    if (!hasMore) break;
  }
  return { events, cursor, hasMore };
}

async function sync(batch) {
  await currentCheck;
  if (!member || !auth.currentUser || auth.currentUser.uid !== member.uid) {
    throw new Error(memberError || 'Firebase-এ অনুমোদিত সেলসম্যান হিসেবে লগইন করুন।');
  }
  const applied = [];
  const conflicts = [];
  const blocked = new Set();
  for (const event of batch) {
    const key = event.entity + ':' + event.entityId;
    if (blocked.has(key)) continue; // Preserve the pending per-record event chain.
    const result = await appendEvent(event);
    if (result.applied) applied.push(event.id);
    else { conflicts.push(result.conflict); blocked.add(key); }
  }
  const remote = await fetchEvents();
  return { applied, conflicts, ...remote };
}

window.shikkhaFirebase = {
  signIn, logOut, sync, ackCursor, resetCursor,
  subscribe(callback) {
    listeners.add(callback);
    callback(member, memberError);
    return () => listeners.delete(callback);
  },
  get member() { return member; },
  get error() { return memberError; }
};
window.dispatchEvent(new Event('shikkha-firebase-ready'));
