// Klarr Partner Referral System — Firebase Backend
// Real cross-browser tracking with Firestore

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, addDoc, getDocs, query, where,
  doc, getDoc, updateDoc, serverTimestamp, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Your real Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB65lbtE-2TbfC6XzQ8_zHsu-zh0ch4UR4",
  authDomain: "klarr-fa508.firebaseapp.com",
  projectId: "klarr-fa508",
  storageBucket: "klarr-fa508.firebasestorage.app",
  messagingSenderId: "1059958349807",
  appId: "1:1059958349807:web:56a25844725fce7183e01a",
  measurementId: "G-JEDM340TC4"
};

let app, db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('Firebase initialized');
} catch (e) {
  console.error('Firebase init failed:', e);
}

// --- TRACKING: Record referral click ---
export async function trackReferralClick() {
  if (!db) return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (!ref) return;

  try {
    await addDoc(collection(db, 'clicks'), {
      partnerId: ref,
      timestamp: serverTimestamp(),
      page: window.location.pathname,
      referrer: document.referrer || 'direct'
    });
    console.log('Referral click tracked:', ref);
  } catch (e) { console.error('Click tracking failed:', e); }

  // Set 90-day cookie for attribution
  document.cookie = `klarr_ref=${ref}; max-age=7776000; path=/; SameSite=Lax`;
}

// --- TRACKING: Get referrer from URL or cookie ---
export function getReferrerId() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('ref')) return params.get('ref');
  const match = document.cookie.match(/klarr_ref=([^;]+)/);
  return match ? match[1] : null;
}

// --- SIGNUP: Record a referred customer ---
export async function recordReferredSignup(email, plan) {
  if (!db) return;
  const refId = getReferrerId();
  if (!refId) return;

  const commissions = { starter: 19.80, growth: 29.80, pro: 49.80 };
  const commission = commissions[plan] || 0;

  try {
    const existing = await getDocs(
      query(collection(db, 'referrals'), where('email', '==', email))
    );
    if (!existing.empty) return;

    await addDoc(collection(db, 'referrals'), {
      partnerId: refId,
      email: email,
      plan: plan,
      commission: commission,
      status: 'active',
      createdAt: serverTimestamp()
    });
    console.log('Referred signup recorded:', email, plan);
  } catch (e) { console.error('Signup recording failed:', e); }
}

// --- PARTNER SIGNUP: Create new partner ---
export async function createPartner(data) {
  if (!db) throw new Error('Firebase not initialized');

  const id = 'klarr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  await addDoc(collection(db, 'partners'), {
    id: id,
    name: data.name,
    email: data.email,
    role: data.role || '',
    clients: data.clients || '',
    createdAt: serverTimestamp(),
    status: 'active'
  });

  return {
    id: id,
    link: 'https://klarr.space/?ref=' + id,
    dashboardUrl: '/partners/dashboard.html?id=' + id
  };
}

// --- DASHBOARD: Load partner stats ---
export async function getPartnerStats(partnerId) {
  if (!db) return null;

  const clicksSnap = await getDocs(
    query(collection(db, 'clicks'), where('partnerId', '==', partnerId))
  );
  const referralsSnap = await getDocs(
    query(collection(db, 'referrals'), where('partnerId', '==', partnerId))
  );

  const clicks = clicksSnap.docs.map(d => d.data());
  const referrals = referralsSnap.docs.map(d => d.data());
  const active = referrals.filter(r => r.status === 'active');
  const earnings = active.reduce((sum, r) => sum + r.commission, 0);

  return {
    clicks: clicks.length,
    signups: referrals.length,
    active: active.length,
    earnings: earnings.toFixed(2),
    referrals: referrals.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() || new Date(0);
      const tb = b.createdAt?.toDate?.() || new Date(0);
      return tb - ta;
    }),
    recentClicks: clicks.sort((a, b) => {
      const ta = a.timestamp?.toDate?.() || new Date(0);
      const tb = b.timestamp?.toDate?.() || new Date(0);
      return tb - ta;
    }).slice(0, 20)
  };
}

// --- ADMIN: Load all partners ---
export async function getAllPartners() {
  if (!db) return { partners: [], clicks: [], referrals: [] };

  const [partnersSnap, clicksSnap, referralsSnap] = await Promise.all([
    getDocs(query(collection(db, 'partners'), orderBy('createdAt', 'desc'))),
    getDocs(collection(db, 'clicks')),
    getDocs(collection(db, 'referrals'))
  ]);

  return {
    partners: partnersSnap.docs.map(d => ({ ...d.data(), _id: d.id })),
    clicks: clicksSnap.docs.map(d => d.data()),
    referrals: referralsSnap.docs.map(d => d.data())
  };
}

// --- PAYOUT: Create payout request ---
export async function createPayoutRequest(partnerId, amount) {
  if (!db) throw new Error('Firebase not initialized');

  await addDoc(collection(db, 'payouts'), {
    partnerId: partnerId,
    amount: amount,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  const refs = await getDocs(
    query(collection(db, 'referrals'),
      where('partnerId', '==', partnerId),
      where('status', '==', 'active'))
  );
  for (const r of refs.docs) {
    await updateDoc(doc(db, 'referrals', r.id), { status: 'paid' });
  }
}
