// Klarr Partner Referral System
// Uses localStorage for tracking (no backend needed)

(function() {

  // --- UTILITY ---
  function generateId() {
    return 'klarr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }

  function getData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { return []; }
  }

  function setData(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function getPartnerData() { return getData('klarr_partners'); }
  function setPartnerData(d) { setData('klarr_partners', d); }
  function getClickData() { return getData('klarr_clicks'); }
  function setClickData(d) { setData('klarr_clicks', d); }
  function getSignupData() { return getData('klarr_signups'); }
  function setSignupData(d) { setData('klarr_signups', d); }
  function getPayoutData() { return getData('klarr_payouts'); }
  function setPayoutData(d) { setData('klarr_payouts', d); }

  // --- REFERRAL TRACKING ---
  function trackReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;

    // Record the click
    const clicks = getClickData();
    clicks.push({
      partnerId: ref,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      referrer: document.referrer || 'direct'
    });
    setClickData(clicks);

    // Set cookie for 90-day attribution
    document.cookie = `klarr_ref=${ref}; max-age=7776000; path=/; SameSite=Lax`;
  }

  function getReferrerId() {
    // Check URL first, then cookie
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref')) return params.get('ref');

    const match = document.cookie.match(/klarr_ref=([^;]+)/);
    return match ? match[1] : null;
  }

  // Record a signup (call this when someone signs up/pays)
  window.recordKlarrSignup = function(email, plan) {
    const refId = getReferrerId();
    if (!refId) return;

    const signups = getSignupData();
    // Check if already recorded
    if (signups.find(s => s.email === email)) return;

    const commissions = { starter: 19.80, growth: 29.80, pro: 49.80 };
    const commission = commissions[plan] || 0;

    signups.push({
      partnerId: refId,
      email: email,
      plan: plan,
      commission: commission,
      status: 'active',
      createdAt: new Date().toISOString()
    });
    setSignupData(signups);
  };

  // --- PARTNER SIGNUP ---
  window.signupPartner = function() {
    const name = document.getElementById('p_name').value.trim();
    const email = document.getElementById('p_email').value.trim();
    const website = document.getElementById('p_website').value.trim();
    const role = document.getElementById('p_role').value;
    const clients = document.getElementById('p_clients').value;

    if (!name || !email) { alert('Name and email are required.'); return; }

    const id = generateId();
    const partners = getPartnerData();

    // Check if email already registered
    if (partners.find(p => p.email === email)) {
      alert('This email is already registered. Contact hello@klarr.space for help.');
      return;
    }

    partners.push({
      id: id,
      name: name,
      email: email,
      website: website,
      role: role,
      clients: clients,
      createdAt: new Date().toISOString(),
      totalClicks: 0,
      totalSignups: 0,
      totalEarnings: 0,
      balance: 0,
      paidOut: 0
    });
    setPartnerData(partners);

    const link = 'https://klarr.space/?ref=' + id;

    // Show success
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('success-box').style.display = 'block';
    document.getElementById('ref-link').value = link;
    document.getElementById('partner-id').textContent = id;
    document.getElementById('dashboard-link').href = '/partners/dashboard.html?id=' + id;
  };

  window.copyLink = function() {
    const input = document.getElementById('ref-link');
    input.select();
    document.execCommand('copy');
    const btn = document.querySelector('.btn-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  };

  // --- DASHBOARD ---
  window.loadDashboard = function() {
    const params = new URLSearchParams(window.location.search);
    const partnerId = params.get('id');
    if (!partnerId) {
      document.getElementById('dashboard-content').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">No partner ID. Sign up first.</p>';
      return;
    }

    const partners = getPartnerData();
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) {
      document.getElementById('dashboard-content').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Partner not found. Contact hello@klarr.space</p>';
      return;
    }

    const clicks = getClickData().filter(c => c.partnerId === partnerId);
    const signups = getSignupData().filter(s => s.partnerId === partnerId);
    const activeSignups = signups.filter(s => s.status === 'active');
    const totalEarnings = activeSignups.reduce((sum, s) => sum + s.commission, 0);

    // Update partner stats
    partner.totalClicks = clicks.length;
    partner.totalSignups = signups.length;
    partner.totalEarnings = totalEarnings.toFixed(2);
    partner.balance = (totalEarnings - partner.paidOut).toFixed(2);
    setPartnerData(partners);

    // Render
    document.getElementById('dash-name').textContent = partner.name;
    document.getElementById('dash-link').value = 'https://klarr.space/?ref=' + partnerId;
    document.getElementById('dash-clicks').textContent = clicks.length;
    document.getElementById('dash-signups').textContent = signups.length;
    document.getElementById('dash-active').textContent = activeSignups.length;
    document.getElementById('dash-earnings').textContent = '$' + totalEarnings.toFixed(2) + '/mo';
    document.getElementById('dash-balance').textContent = '$' + parseFloat(partner.balance).toFixed(2);

    // Signup table
    const tbody = document.getElementById('dash-signups-body');
    if (signups.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:20px;">No signups yet. Share your link!</td></tr>';
    } else {
      tbody.innerHTML = signups.map(s => {
        const date = new Date(s.createdAt).toLocaleDateString();
        const statusColor = s.status === 'active' ? '#52c878' : '#8b8880';
        return '<tr>' +
          '<td>' + date + '</td>' +
          '<td>@' + s.email.split('@')[0] + '**</td>' +
          '<td>' + s.plan + '</td>' +
          '<td style="color:' + statusColor + '">' + s.status + '</td>' +
          '<td style="color:var(--accent)">$' + s.commission.toFixed(2) + '/mo</td>' +
        '</tr>';
      }).join('');
    }

    // Recent clicks
    const recentClicks = clicks.slice(-10).reverse();
    const clicksBody = document.getElementById('dash-clicks-body');
    if (recentClicks.length === 0) {
      clicksBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:20px;">No clicks yet.</td></tr>';
    } else {
      clicksBody.innerHTML = recentClicks.map(c => {
        const date = new Date(c.timestamp).toLocaleDateString() + ' ' + new Date(c.timestamp).toLocaleTimeString();
        return '<tr><td>' + date + '</td><td>' + (c.referrer || 'direct') + '</td></tr>';
      }).join('');
    }
  };

  window.copyDashLink = function() {
    const input = document.getElementById('dash-link');
    input.select();
    document.execCommand('copy');
    const btn = document.querySelector('.dash-copy-btn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
  };

  // --- ADMIN DASHBOARD ---
  window.loadAdmin = function() {
    const partners = getPartnerData();
    const signups = getSignupData();
    const clicks = getClickData();

    document.getElementById('admin-total-partners').textContent = partners.length;
    document.getElementById('admin-total-clicks').textContent = clicks.length;
    document.getElementById('admin-total-signups').textContent = signups.length;
    document.getElementById('admin-total-earnings').textContent = '$' + signups.reduce((s, x) => s + x.commission, 0).toFixed(2) + '/mo';

    const tbody = document.getElementById('admin-partners-body');
    if (partners.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:20px;">No partners signed up yet.</td></tr>';
      return;
    }

    tbody.innerHTML = partners.map(p => {
      const pClicks = clicks.filter(c => c.partnerId === p.id).length;
      const pSignups = signups.filter(s => s.partnerId === p.id).length;
      const pEarnings = signups.filter(s => s.partnerId === p.id).reduce((s, x) => s + x.commission, 0);
      const date = new Date(p.createdAt).toLocaleDateString();
      return '<tr>' +
        '<td><strong>' + p.name + '</strong></td>' +
        '<td>' + p.email + '</td>' +
        '<td>' + (p.role || '—') + '</td>' +
        '<td>' + date + '</td>' +
        '<td>' + pClicks + '</td>' +
        '<td>' + pSignups + '</td>' +
        '<td style="color:var(--accent)">$' + pEarnings.toFixed(2) + '/mo</td>' +
      '</tr>';
    }).join('');
  };

  // --- PAYOUT REQUEST ---
  window.requestPayout = function() {
    const params = new URLSearchParams(window.location.search);
    const partnerId = params.get('id');
    if (!partnerId) return;

    const partners = getPartnerData();
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return;

    const balance = parseFloat(partner.balance);
    if (balance < 25) {
      alert('Minimum payout is $25. Current balance: $' + balance.toFixed(2));
      return;
    }

    const payoutId = generateId();
    const payouts = getPayoutData();
    payouts.push({
      id: payoutId,
      partnerId: partnerId,
      amount: balance,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    setPayoutData(payouts);

    partner.paidOut += balance;
    partner.balance = 0;
    setPartnerData(partners);

    alert('Payout request submitted! Amount: $' + balance.toFixed(2) + '. We will process it within 7 business days via PayPal or bank transfer.');
    loadDashboard(); // refresh
  };

  // --- INITIALIZE ---
  // Track referral on every page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackReferral);
  } else {
    trackReferral();
  }

})();
