// NovaDoc Admin Dashboard & Analytics Engine
let allPayments = [];
let activePeriod = 'all';

const FEATURE_NAMES = {
    'cv': "Créateur de CV Pro",
    'scanner_cv': "Scanner CV (IA)",
    'demande_emploi': "Demande d'Emploi",
    'lettre_motivation': "Lettre de Motivation",
    'demande_stage': "Demande de Stage",
    'contrat_location': "Contrat de Location",
    'acte_vente': "Acte de Vente Véhicule",
    'demande_autorisation': "Demande d'Autorisation"
};

const FEATURE_COLORS = {
    'cv': '#4F46E5',
    'scanner_cv': '#6366F1',
    'demande_emploi': '#7C3AED',
    'lettre_motivation': '#C026D3',
    'demande_stage': '#0284C7',
    'contrat_location': '#059669',
    'acte_vente': '#D97706',
    'demande_autorisation': '#1D4ED8'
};

document.addEventListener('DOMContentLoaded', async () => {
    await fetchPaymentsData();
});

async function fetchPaymentsData() {
    try {
        const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
        const SUPABASE_KEY = localStorage.getItem('supabase_anon_key');

        if (SUPABASE_KEY && window.supabase) {
            const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            const { data, error } = await client.from('user_payments').select('*').order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                allPayments = data;
            } else {
                allPayments = generateDemoPayments();
            }
        } else {
            allPayments = generateDemoPayments();
        }
    } catch (e) {
        console.warn("Utilisation des données analytiques de démonstration :", e);
        allPayments = generateDemoPayments();
    }

    renderDashboard();
}

function renderDashboard() {
    const filtered = filterPaymentsByPeriod(allPayments, activePeriod);

    // 1. Calculate Summary Metrics
    const totalRev = filtered.reduce((acc, p) => p.status === 'SUCCESS' ? acc + Number(p.amount) : acc, 0);
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayRev = allPayments.reduce((acc, p) => {
        const pDate = new Date(p.created_at).toISOString().split('T')[0];
        return (p.status === 'SUCCESS' && pDate === todayStr) ? acc + Number(p.amount) : acc;
    }, 0);

    const monthRev = allPayments.reduce((acc, p) => {
        const d = new Date(p.created_at);
        return (p.status === 'SUCCESS' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) ? acc + Number(p.amount) : acc;
    }, 0);

    const totalTx = filtered.length;
    const successTx = filtered.filter(p => p.status === 'SUCCESS').length;
    const pendingTx = filtered.filter(p => p.status === 'PENDING').length;
    const failedTx = filtered.filter(p => p.status === 'FAILED').length;
    const successRate = totalTx > 0 ? Math.round((successTx / totalTx) * 100) : 100;

    // Update UI Stats
    document.getElementById('stat-total-revenue').textContent = formatFCFA(totalRev);
    document.getElementById('stat-month-revenue').textContent = formatFCFA(monthRev);
    document.getElementById('stat-today-revenue').textContent = formatFCFA(todayRev);
    document.getElementById('stat-total-transactions').textContent = totalTx.toLocaleString('fr-FR');
    document.getElementById('stat-success-rate').innerHTML = `<i class="fa-solid fa-circle-check"></i> ${successRate}% Réussies`;

    // 2. Feature Revenue Breakdown
    renderFeatureBreakdown(filtered, totalRev);

    // 3. Payment Methods Breakdown
    let waveTotal = 0, waveCount = 0;
    let omTotal = 0, omCount = 0;

    filtered.forEach(p => {
        if (p.status === 'SUCCESS') {
            const method = (p.payment_method || '').toLowerCase();
            if (method.includes('wave')) {
                waveTotal += Number(p.amount);
                waveCount++;
            } else {
                omTotal += Number(p.amount);
                omCount++;
            }
        }
    });

    document.getElementById('wave-total-amount').textContent = formatFCFA(waveTotal);
    document.getElementById('wave-tx-count').textContent = `${waveCount} paiements réussis`;
    document.getElementById('om-total-amount').textContent = formatFCFA(omTotal);
    document.getElementById('om-tx-count').textContent = `${omCount} paiements réussis`;

    document.getElementById('count-status-success').textContent = successTx;
    document.getElementById('count-status-pending').textContent = pendingTx;
    document.getElementById('count-status-failed').textContent = failedTx;

    // 4. Render Table
    renderTransactionsTable(filtered);
}

function renderFeatureBreakdown(payments, totalRevenue) {
    const container = document.getElementById('feature-bars-container');
    container.innerHTML = '';

    const featureTotals = {};
    Object.keys(FEATURE_NAMES).forEach(k => featureTotals[k] = 0);

    payments.forEach(p => {
        if (p.status === 'SUCCESS') {
            const featKey = p.feature || 'cv';
            featureTotals[featKey] = (featureTotals[featKey] || 0) + Number(p.amount);
        }
    });

    const sortedFeatures = Object.keys(featureTotals).sort((a, b) => featureTotals[b] - featureTotals[a]);

    sortedFeatures.forEach(featKey => {
        const amount = featureTotals[featKey];
        const name = FEATURE_NAMES[featKey] || featKey;
        const color = FEATURE_COLORS[featKey] || '#4F46E5';
        const percent = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;

        const html = `
            <div class="feature-bar-item">
                <div class="feature-bar-info">
                    <span>${name}</span>
                    <span>${formatFCFA(amount)} (${percent}%)</span>
                </div>
                <div class="feature-bar-bg">
                    <div class="feature-bar-fill" style="width: ${percent}%; background: ${color};"></div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

function renderTransactionsTable(payments) {
    const tbody = document.getElementById('transactions-table-body');
    tbody.innerHTML = '';

    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Aucune transaction trouvée pour cette période.</td></tr>`;
        return;
    }

    payments.forEach(p => {
        const dateStr = new Date(p.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const featName = FEATURE_NAMES[p.feature] || p.feature || 'Document';
        const method = p.payment_method || 'Wave / OM';
        
        let statusBadge = '';
        if (p.status === 'SUCCESS') {
            statusBadge = `<span class="badge-status badge-success"><i class="fa-solid fa-check"></i> Réussi</span>`;
        } else if (p.status === 'PENDING') {
            statusBadge = `<span class="badge-status badge-pending"><i class="fa-solid fa-clock"></i> En Attente</span>`;
        } else {
            statusBadge = `<span class="badge-status badge-failed"><i class="fa-solid fa-xmark"></i> Échoué</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code style="font-size: 0.78rem; background: var(--background); padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid var(--border);">${p.id || 'TX-8839'}</code></td>
            <td><strong>${p.user_email || p.user_id || 'client@novadoc.sn'}</strong></td>
            <td><span style="font-weight: 600;">${featName}</span></td>
            <td><strong style="color: var(--primary);">${formatFCFA(p.amount)}</strong></td>
            <td>${method}</td>
            <td>${statusBadge}</td>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setPeriodFilter(period, btn) {
    activePeriod = period;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const labels = {
        'all': 'Période : Global (Tout le temps)',
        'today': "Période : Aujourd'hui",
        'month': 'Période : Ce Mois-ci',
        'year': 'Période : Cette Année'
    };
    document.getElementById('feature-period-label').textContent = labels[period] || 'Période : Global';
    renderDashboard();
}

function filterPaymentsByPeriod(payments, period) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return payments.filter(p => {
        const d = new Date(p.created_at);
        if (period === 'today') {
            return d.toISOString().split('T')[0] === todayStr;
        } else if (period === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (period === 'year') {
            return d.getFullYear() === now.getFullYear();
        }
        return true;
    });
}

function filterTransactionsTable() {
    const query = document.getElementById('table-search').value.toLowerCase();
    const filtered = filterPaymentsByPeriod(allPayments, activePeriod).filter(p => {
        const email = (p.user_email || p.user_id || '').toLowerCase();
        const txId = (p.id || '').toLowerCase();
        const feat = (FEATURE_NAMES[p.feature] || p.feature || '').toLowerCase();
        const method = (p.payment_method || '').toLowerCase();
        return email.includes(query) || txId.includes(query) || feat.includes(query) || method.includes(query);
    });
    renderTransactionsTable(filtered);
}

function formatFCFA(amount) {
    return Number(amount).toLocaleString('fr-FR') + ' FCFA';
}

function exportCSVReport() {
    const filtered = filterPaymentsByPeriod(allPayments, activePeriod);
    let csv = "ID Transaction;Email Utilisateur;Fonctionnalite;Montant (FCFA);Mode Paiement;Statut;Date\n";

    filtered.forEach(p => {
        const dateStr = new Date(p.created_at).toISOString();
        csv += `"${p.id}";"${p.user_email || 'n/a'}";"${FEATURE_NAMES[p.feature] || p.feature}";"${p.amount}";"${p.payment_method}";"${p.status}";"${dateStr}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Rapport_Revenus_NovaDoc_${activePeriod}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function generateDemoPayments() {
    const demo = [];
    const features = ['cv', 'scanner_cv', 'demande_emploi', 'lettre_motivation', 'demande_stage', 'contrat_location', 'acte_vente', 'demande_autorisation'];
    const amounts = { 'cv': 1000, 'scanner_cv': 1000, 'demande_emploi': 500, 'lettre_motivation': 500, 'demande_stage': 500, 'contrat_location': 1000, 'acte_vente': 1000, 'demande_autorisation': 500 };
    const methods = ['Wave', 'Orange Money'];

    const now = new Date();
    for (let i = 1; i <= 35; i++) {
        const feat = features[Math.floor(Math.random() * features.length)];
        const amt = amounts[feat];
        const method = methods[Math.floor(Math.random() * methods.length)];
        
        // Random date within last 30 days
        const d = new Date();
        d.setDate(now.getDate() - Math.floor(Math.random() * 28));

        demo.push({
            id: `TX-${1000 + i}`,
            user_email: `client${i}@gmail.com`,
            feature: feat,
            amount: amt,
            payment_method: method,
            status: 'SUCCESS',
            created_at: d.toISOString()
        });
    }

    return demo;
}

// Theme switch helper
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('novadoc_theme', newTheme);
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
