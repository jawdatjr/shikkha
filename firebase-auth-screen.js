// Ashik Shikkha — sign-in gate. Firebase Auth secures cloud access;
// the gate hides the UI, but local browser storage is not encrypted.
(function () {
  'use strict';
  const gate = document.getElementById('firebaseAuthGate');
  const appRoot = document.getElementById('appRoot');
  const form = document.getElementById('firebaseGateForm');
  const email = document.getElementById('firebaseGateEmail');
  const password = document.getElementById('firebaseGatePassword');
  const message = document.getElementById('firebaseGateMessage');
  const submit = document.getElementById('firebaseGateSubmit');
  const toggle = document.getElementById('firebaseGateTogglePassword');
  const memberBadge = document.getElementById('firebaseActiveMember');
  const gateSpinner = document.getElementById('firebaseGateWait');
  let busy = false;
  let subscribed = false;
  if (!gate || !appRoot || !form || !email || !password || !message || !submit) return;

  function lock() {
    document.body.classList.remove('firebase-unlocked');
    document.body.classList.add('firebase-locked');
    appRoot.inert = true;
    gate.hidden = false;
  }
  function unlock(member) {
    appRoot.inert = false;
    gate.hidden = true;
    document.body.classList.remove('firebase-locked');
    document.body.classList.add('firebase-unlocked');
    password.value = '';
    if (memberBadge) memberBadge.textContent = member.displayName + ' (' + member.role + ')';
  }
  function errorText(err) {
    const code = err && err.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' ||
        code === 'auth/user-not-found') return 'Email অথবা Password সঠিক নয়। Firebase Authentication → Users যাচাই করুন।';
    if (code === 'auth/too-many-requests') return 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।';
    if (code === 'auth/network-request-failed') return 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। প্রথম লগইন অনলাইনে করতে হবে।';
    if (code === 'permission-denied') return 'Firestore Rules অথবা members/UID অনুমতি যাচাই করুন।';
    return (err && (err.message || String(err))) || 'লগইন করা যায়নি। আবার চেষ্টা করুন।';
  }
  function setMessage(text, bad) {
    message.textContent = text;
    message.style.color = bad ? '#fecaca' : '#bae6fd';
  }
  function draw(member, error, initialized) {
    if (member) {
      unlock(member);
      return;
    }
    lock();
    if (gateSpinner) gateSpinner.hidden = initialized || Boolean(error);
    submit.disabled = busy || !initialized;
    if (busy) return;
    if (error) setMessage(errorText({message: error}), true);
    else setMessage(initialized
      ? 'আপনার Firebase Owner / Salesman অ্যাকাউন্ট দিয়ে লগইন করুন।'
      : 'Firebase session যাচাই করা হচ্ছে…', false);
  }
  function connect() {
    if (subscribed || !window.shikkhaFirebase) return;
    subscribed = true;
    window.shikkhaFirebase.subscribe(draw);
  }
  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const backend = window.shikkhaFirebase;
    if (busy || !backend) return;
    if (!email.value.trim() || !password.value) {
      setMessage('Email এবং Password দুটোই দিন।', true);
      return;
    }
    busy = true; submit.disabled = true;
    setMessage('Firebase লগইন ও অনুমতি যাচাই করা হচ্ছে…', false);
    try {
      await backend.signIn(email.value.trim(), password.value);
      password.value = '';
    } catch (err) {
      setMessage(errorText(err), true);
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
  if (toggle) toggle.addEventListener('click', function () {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  window.addEventListener('shikkha-firebase-ready', connect, { once: true });
  connect();
  lock();
  // If an SDK cannot be loaded, offer a clear recovery instead of a blank screen.
  window.addEventListener('load', function () {
    if (!window.shikkhaFirebase) {
      setMessage('Firebase SDK লোড হয়নি। ইন্টারনেট চালু করে অ্যাপ Refresh করুন। মোবাইলের পুরোনো হিসাব মুছবেন না।', true);
      if (gateSpinner) gateSpinner.hidden = true;
    }
  });
})();
