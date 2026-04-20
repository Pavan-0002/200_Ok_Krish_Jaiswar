// PocketSense AI - Optimized Core Application Logic
const BASE_URL = 'https://200okkrishjaiswar-production.up.railway.app';
const API_BASE_URL = `${BASE_URL}/api`;
let supabaseClient = null;

const MOCK_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

/**
 * 🚀 APPLICATION LIFECYCLE
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        setupGlobalNavigation();
        
        const path = window.location.pathname;
        if (path.includes('dashboard.html')) {
            await refreshAllMetrics(); 
            setupBillScan();
        } else if (path.includes('savings.html')) {
            setupSavings();
        } else if (path.includes('insights.html')) {
            setupInsights();
        } else if (path.includes('profile.html')) {
            setupProfile();
        } else if (path.includes('login.html')) {
            setupLogin();
        } else if (path.includes('signup.html')) {
            setupSignup();
        }
    } catch (error) {
        console.error("Critical System Failure:", error);
    }
});

/**
 * 🔐 AUTHENTICATION & SESSION MANAGEMENT
 */
async function initSupabase() {
    try {
        const res = await fetch(`${BASE_URL}/auth-config`);
        if (!res.ok) throw new Error("No config");

        const config = await res.json();

        if (config.url && config.key) {
            supabaseClient = supabase.createClient(config.url, config.key);
        }
    } catch (e) {
        console.warn("Supabase disabled");
        supabaseClient = null;
    }
}

async function getAuthenticatedUser() {
    if (supabaseClient) {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error) throw error;
            return user;
        } catch (e) {
            return null;
        }
    }
    return null;
}

async function getUserId() {
    if (supabaseClient) {
        const user = await getAuthenticatedUser();
        if (user) return user.id;
    }
    return MOCK_USER_ID;
}

/**
 * 💉 API HELPER
    */
async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            console.error(`API Error (${response.status}) at ${endpoint}:`, errorMsg);
            throw new Error(errorMsg || `API Error: ${response.status}`);
        }

        const text = await response.text();
        if (!text) return {};
        try {
            const data = JSON.parse(text);
            console.log(`Response from ${endpoint}:`, data);
            return data;
        } catch(e) {
            return {};
        }
    } catch (error) {
        console.error(`Fetch Failure at ${endpoint}:`, error);
        throw error;
    }
}
/**
 * 💡 AI INSIGHTS & ANALYTICS
 */
async function refreshAllMetrics() {
    try {
        await Promise.allSettled([
            setupDashboard(),
            triggerAlertToasts(),
            window.location.pathname.includes('insights.html') ? setupInsights() : Promise.resolve(),
            window.location.pathname.includes('profile.html') ? setupProfile() : Promise.resolve()
        ]);
    } catch (e) {
        console.error("Metric refresh failed:", e);
    }
}

/**
 * 🚨 ALERT SYSTEM
 */
async function triggerAlertToasts() {
    const userId = await getUserId();
    const container = document.getElementById('dashAlertsContainer');
    
    try {
        const alerts = await apiFetch(`/alerts/${userId}`).catch(() => []);
        if (container) {
            container.innerHTML = alerts.length ? '' : '<p class="text-secondary text-sm">No recent alerts.</p>';
            alerts.forEach((alert, i) => {
                const div = document.createElement('div');
                div.className = 'alert-item';
                div.innerHTML = `
                    <div class="alert-icon ${alert.type === 'danger' ? 'danger' : 'warning'}">
                        <i class="ph ph-${alert.type === 'danger' ? 'warning-octagon' : 'warning'}"></i>
                    </div>
                    <div class="alert-content">
                        <h4>${alert.type?.toUpperCase()}</h4>
                        <p>${alert.message}</p>
                    </div>
                `;
                container.appendChild(div);
            });
        }
        if (alerts.length > 0 && (alerts[0].type === 'danger' || alerts[0].type === 'warning')) {
            showToast(`⚠️ ${alerts[0].message}`, alerts[0].type);
        }
    } catch (e) { console.error("Alerts sync failed"); }
}

/**
 * 📊 DASHBOARD ENGINE
 */
async function setupDashboard() {
    const userId = await getUserId();
    try {
        const results = await Promise.allSettled([
            apiFetch(`/budget/${userId}`),
            apiFetch(`/health/${userId}`),
            apiFetch(`/goal/${userId}`),
            apiFetch(`/analytics/${userId}`),
            apiFetch(`/prediction/${userId}`),
            apiFetch(`/regret/${userId}`)
        ]);

        const [bData, hData, gData, aData, pData, rData] = results.map(r => r.status === 'fulfilled' ? r.value : {});

        const scoreEl = document.getElementById('dashHealthScore');
        if (scoreEl) {
            scoreEl.innerText = hData.score || 0;
            scoreEl.style.color = hData.score >= 80 ? 'var(--accent-success)' : (hData.score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)');
        }

        setText('dashHealthStatus', hData.status || 'N/A');
        setText('dashHealthMessage', hData.message || '');
        setText('dashTodaySpend', `₹${(bData.spent || 0).toLocaleString()}`);
        setText('dashBudgetRemaining', `₹${(bData.remaining || 0).toLocaleString()}`);
        setText('dashGoalSpend', `₹${(gData.totalSaved || 0).toLocaleString()} / ₹${(gData.targetAmount || 0).toLocaleString()}`);
        setText('dashRegretPercent', `${rData.percentage || 0}%`);
        setText('dashRegretMessage', rData.message || '');
        setText('dashPredictionAmount', `₹${(pData.predictedTotal || 0).toLocaleString()}`);
        setText('dashPredictionMessage', pData.message || '');

        const analyticsWrap = document.getElementById('analyticsGroup');
        if (analyticsWrap) {
            analyticsWrap.innerHTML = `
                <span class="pill">📈 Daily Avg: ₹${Math.round(aData.dailyAverage || 0)}</span>
                <span class="pill">🏆 Top Spend: ${aData.topCategory || 'N/A'}</span>
            `;
        }

        const expenses = await apiFetch(`/expenses/${userId}`).catch(() => []);
        renderExpenses(expenses || []);
    } catch (e) { 
        console.error("Dashboard engine failure:", e);
        setText('dashHealthStatus', 'Offline');
        setText('dashHealthMessage', 'Could not load data.');
    }
}

/**
 * 🧩 INSIGHTS ENGINE
 */
async function setupInsights() {
    const userId = await getUserId();
    setText('insightPrimaryTitle', 'AI Analyzing...');
    setText('insightPrimaryDesc', 'Processing your transaction history for patterns...');
    
    try {
        const data = await apiFetch(`/insights/${userId}`).catch(() => ({}));
        setText('insightPrimaryTitle', data.personality || 'Balanced Spender');
        setText('insightPrimaryDesc', data.message || 'No specific insights detected yet.');
        setText('insightStat1', data.topCategory || 'N/A');
        setText('insightStat2', data.trend || 'Stable');
        
        const ctx = document.getElementById('spendChart')?.getContext('2d');
        if (ctx) {
            const expenses = await apiFetch(`/expenses/${userId}`).catch(() => []);
            const groups = (expenses || []).reduce((acc, obj) => {
                const cat = (obj.category || "Other").charAt(0).toUpperCase() + (obj.category || "Other").slice(1).toLowerCase();
                acc[cat] = (acc[cat] || 0) + obj.amount;
                return acc;
            }, {});
            
            if (window.mySpendChart) window.mySpendChart.destroy();
            window.mySpendChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(groups),
                    datasets: [{
                        data: Object.values(groups),
                        backgroundColor: ['#B500FF', '#00E5FF', '#F43F5E', '#10B981', '#F59E0B']
                    }]
                },
                options: { plugins: { legend: { display: false } }, cutout: '70%', responsive: true }
            });
        }
    } catch (e) { 
        console.error("Insights load failure:", e);
        setText('insightPrimaryTitle', 'Unavailable');
        setText('insightPrimaryDesc', 'Failed to generate insights. Ensure backend is running.');
    }
}

/**
 * 💰 SAVINGS MANAGEMENT
 */
async function setupSavings() {
    const userId = await getUserId();
    const addSavingForm = document.getElementById('addSavingForm');
    const setGoalForm = document.getElementById('setGoalForm');

    const fetchSavingsData = async () => {
        try {
            const data = await apiFetch(`/goal/${userId}`).catch(() => ({}));
            const progress = data.progress || 0;
            const bar = document.getElementById('savingsProgressBarFilled');
            if (bar) {
                bar.style.width = `${progress}%`;
                bar.style.background = data.status?.includes('Behind') ? '#F43F5E' : 'var(--grad-primary)';
            }
            setText('goalPercentageNode', `${Math.round(progress)}%`);
            setText('goalAmountNode', `₹${(data.totalSaved || 0).toLocaleString()} / ₹${(data.targetAmount || 0).toLocaleString()}`);
            
            const statusNode = document.getElementById('goalStatusNode');
            if (statusNode) {
                statusNode.innerText = data.status || 'On Track ✅';
                statusNode.className = `status-badge ${data.status?.includes('Behind') ? 'status-behind' : 'status-on-track'}`;
            }

            setText('totalSavingsDisplay', `₹${(data.totalSaved || 0).toLocaleString()}`);
            setText('remainingAmountDisplay', `₹${(data.remainingAmount || 0).toLocaleString()}`);
            setText('savingsDailyNeed', `₹${Math.round(data.dailySavingsNeeded || 0)}`);
            setText('savingsDaysLeft', data.daysRemaining || 0);
            setText('savingsDailyMsg', `Target Forecast: ₹${Math.round(data.dailySavingsNeeded || 0)}/day`);
            
            // Also fetch savings list
            const savings = await apiFetch(`/savings/${userId}`).catch(() => []);
            renderSavingsList(savings);
        } catch (e) { 
            console.error("Savings fetch failure:", e);
            setText('goalPercentageNode', 'Error');
        }
    };

    if (addSavingForm) {
        addSavingForm.onsubmit = async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('savingAmountInput').value);
            try {
                await apiFetch(`/addSaving`, {
                    method: 'POST',
                    body: JSON.stringify({ userId, amount, date: new Date().toISOString().split('T')[0] })
                });
                showToast("Saving recorded! 👛", "success");
                addSavingForm.reset();
                await fetchSavingsData();
                refreshAllMetrics();
            } catch (e) { showToast("Failed to record saving", "danger"); }
        };
    }

    if (setGoalForm) {
        setGoalForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                await apiFetch(`/setGoal`, {
                    method: 'POST',
                    body: JSON.stringify({
                        userId,
                        targetAmount: parseFloat(document.getElementById('goalAmountInput').value),
                        deadline: document.getElementById('goalDateInput').value
                    })
                });
                showToast("New strategy defined! 🎯", "success");
                await fetchSavingsData();
                refreshAllMetrics();
            } catch (e) { showToast("Failed to define goal", "danger"); }
        };
    }
    fetchSavingsData();
}

/**
 * 🧑 PROFILE & PREFERENCES
 */
async function setupProfile() {
    const userId = await getUserId();
    const avatarInput = document.getElementById('avatarUploadInput');
    const profileForm = document.getElementById('profileForm');
    const resetDataBtn = document.getElementById('resetDataBtn');

    const loadProfile = async () => {
        try {
            const data = await apiFetch(`/profile/${userId}`).catch(() => ({}));
            setValue('profileName', data.name);
            setValue('profileBudget', data.monthlyBudget);
            setValue('profileSavings', data.savingsGoal);
            setText('profileEmail', data.email || "No Email Linked");

            const display = document.getElementById('profileImageDisplay');
            const placeholder = document.getElementById('profileAvatarPlaceholder');
            if (data.imageUrl && display && placeholder) {
                display.src = data.imageUrl;
                display.style.display = 'block';
                placeholder.style.display = 'none';
            } else if (display && placeholder) {
                display.style.display = 'none';
                placeholder.style.display = 'flex';
            }
            
            const badgeContainer = document.getElementById('badgesContainer');
            if (badgeContainer) {
                const insights = await apiFetch(`/insights/${userId}`).catch(() => ({}));
                badgeContainer.innerHTML = insights.badges?.map(b => `<div class="badge-card"><i class="ph ph-shield-star text-gradient"></i> ${b}</div>`).join('') || '<p class="text-secondary text-sm">No badges yet.</p>';
            }
        } catch (e) { console.error("Profile load failure"); }
    };

    if (avatarInput) {
        avatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file || !supabaseClient) return;
            try {
                showToast("Uploading...", "info");
                const path = `avatars/${userId}-${Date.now()}.png`;
                const { data, error } = await supabaseClient.storage.from('profile-images').upload(path, file);
                
                if (error) {
                    if (error.message?.includes('Bucket not found')) {
                        throw new Error("Missing 'profile-images' bucket in Supabase! Please create it and set to public.");
                    }
                    throw error;
                }

                const { data: { publicUrl } } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
                await apiFetch(`/profile`, {
                    method: 'POST',
                    body: JSON.stringify({ userId, imageUrl: publicUrl })
                });
                showToast("Avatar synchronized! ✨", "success");
                await loadProfile();
                refreshAllMetrics();
            } catch (err) { 
                console.error(err); 
                showToast(err.message || "Upload error", "danger"); 
            }
        };
    }

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                await apiFetch(`/profile`, {
                    method: 'POST',
                    body: JSON.stringify({
                        userId,
                        name: document.getElementById('profileName').value,
                        monthlyBudget: parseFloat(document.getElementById('profileBudget').value),
                        savingsGoal: parseFloat(document.getElementById('profileSavings').value)
                    })
                });
                showToast("Profile updated successfully!", "success");
                refreshAllMetrics();
            } catch (e) { showToast("Sync failed", "danger"); }
        };
    }

    if (resetDataBtn) {
        resetDataBtn.onclick = async () => {
            if (confirm("🚨 WARNING: This will permanently wipe all your records and goals. Continue?")) {
                try {
                    await apiFetch(`/reset/${userId}`, { method: 'DELETE' });
                    showToast("System Reset Complete", "info");
                    setTimeout(() => location.reload(), 1000);
                } catch (e) { showToast("Reset failed", "danger"); }
            }
        };
    }

    loadProfile();
}

/**
 * 🛠 GLOBAL FUNCTIONALITY
 */
function setupGlobalNavigation() {
    const fab = document.getElementById('fabAddModal');
    const modal = document.getElementById('expenseModal');
    const submit = document.getElementById('submitExpenseBtn');

    if (fab) fab.onclick = () => modal.classList.add('active');
    const closeBtn = document.getElementById('closeModalBtn');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
    
    document.querySelectorAll('.category-select').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.category-select').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    if (submit) {
        submit.onclick = async () => {
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const category = document.querySelector('.category-select.active')?.innerText || "Food";
            const isRegret = document.getElementById('expenseRegret')?.checked || false;

            if (!amount) return showToast("Amount required", "danger");
            try {
                await apiFetch(`/addExpense`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: await getUserId(), amount, category, isRegret })
                });
                showToast("Transaction Logged! 💳", "success");
                modal.classList.remove('active');
                document.getElementById('expenseForm')?.reset();
                refreshAllMetrics();
            } catch (e) { 
                console.error("Critical Persistence Failure:", e);
                showToast("Persistence failed. Check console.", "danger"); 
            }
        };
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (supabaseClient) await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        };
    }
}

function renderExpenses(expenses) {
    const list = document.getElementById('dashPillGroup');
    if (!list) return;
    list.innerHTML = expenses.length ? '' : '<p class="text-secondary text-sm">No recent transactions.</p>';
    expenses.slice(0, 5).forEach(ex => {
        const item = document.createElement('div');
        item.className = 'pill';
        item.style.borderLeft = ex.isRegret ? '3px solid #F43F5E' : 'none';
        item.innerHTML = `
            <span>${ex.category || 'Other'} ${ex.isRegret ? '😬' : ''}</span>
            <span class="font-bold">₹${(ex.amount || 0).toLocaleString()}</span>
            <button onclick="deleteExpense('${ex.id}')" style="background:none; border:none; color:#F43F5E; cursor:pointer;"><i class="ph ph-trash"></i></button>
        `;
        list.appendChild(item);
    });
}

function renderSavingsList(savings) {
    const list = document.getElementById('savingsListContainer');
    if (!list) return;
    list.innerHTML = (savings && savings.length) ? '' : '<p class="text-secondary text-sm">No recent savings recorded.</p>';
    if (!savings || !Array.isArray(savings)) return;
    
    savings.slice().reverse().forEach(s => {
        const item = document.createElement('div');
        item.className = 'pill';
        item.style.justifyContent = 'space-between';
        const date = s.date ? new Date(s.date).toLocaleDateString() : 'N/A';
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.5rem;">
                <i class="ph ph-trend-up text-success"></i>
                <span>${date}</span>
            </div>
            <span class="font-bold">+ ₹${(s.amount || 0).toLocaleString()}</span>
        `;
        list.appendChild(item);
    });
}

async function deleteExpense(id) {
    if (confirm("Remove this transaction?")) {
        try {
            await apiFetch(`/expense/${id}`, { method: 'DELETE' });
            showToast("Record removed", "info");
            refreshAllMetrics();
        } catch (e) { showToast("Delete failed", "danger"); }
    }
}

/**
 * 📷 BILL SCANNER
 */
function setupBillScan() {
    const scanBtn = document.getElementById('scanBillBtn');
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');
    const previewImg = document.getElementById('capturedImage');
    const previewWrap = document.getElementById('capturePreviewContainer');

    let stream = null;

    if (scanBtn) {
        scanBtn.onclick = async () => {
            modal.classList.add('active');
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                video.srcObject = stream;
            } catch (e) {
                showToast("Camera blocked 📷", "danger");
                modal.classList.remove('active');
            }
        };
    }

    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
        captureBtn.onclick = () => {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            previewImg.src = canvas.toDataURL('image/png');
            video.style.display = 'none';
            previewWrap.style.display = 'block';
            captureBtn.style.display = 'none';
            document.getElementById('confirmScanBtn').style.display = 'inline-block';
            document.getElementById('retakeBtn').style.display = 'inline-block';
        };
    }

    document.getElementById('retakeBtn').onclick = () => {
        video.style.display = 'block'; previewWrap.style.display = 'none';
        document.getElementById('captureBtn').style.display = 'inline-block';
        document.getElementById('confirmScanBtn').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'none';
    };

    document.getElementById('confirmScanBtn').onclick = async () => {
        const val = prompt("Enter bill amount detected by AI:", "0.00");
        if (val && !isNaN(val)) {
            try {
                await apiFetch(`/addExpense`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: await getUserId(), amount: parseFloat(val), category: 'Bills', isRegret: false })
                });
                showToast(`Scanned ₹${val}`, "success");
                stopCamera();
                refreshAllMetrics();
            } catch (e) { showToast("Scan processing failed", "danger"); }
        }
    };

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        modal.classList.remove('active');
        video.style.display = 'block'; previewWrap.style.display = 'none';
        document.getElementById('captureBtn').style.display = 'inline-block';
        document.getElementById('confirmScanBtn').style.display = 'none';
        document.getElementById('retakeBtn').style.display = 'none';
    };

    const closeCameraBtn = document.getElementById('closeCameraBtn');
    if (closeCameraBtn) closeCameraBtn.onclick = stopCamera;
}

/**
 * 💉 AUTH HELPERS
 */
async function setupLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        try {
            if (supabaseClient) {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            showToast("Welcome! ✨", "success");
            setTimeout(() => window.location.href = 'dashboard.html', 800);
        } catch (err) { showToast(err.message, "danger"); }
    };
}

async function setupSignup() {
    const form = document.getElementById('signupForm');
    if (!form) return;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        try {
            if (supabaseClient) {
                const { error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
            }
            showToast("Account created! Verify your email.", "success");
            setTimeout(() => window.location.href = 'login.html', 1500);
        } catch (err) { showToast(err.message, "danger"); }
    };
}

// Global UI Helpers
function setText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }

function showToast(msg, type = "info") {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed; top:2rem; right:2rem; padding:1rem 1.5rem; border-radius:12px; color:#fff; font-weight:600; z-index:10000; display:flex; align-items:center; gap:0.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.3); animation:slideInToast 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; background:${type === 'danger' ? '#F43F5E' : type === 'success' ? '#10B981' : '#6366F1'}`;
    toast.innerHTML = `<i class="ph ph-${type === 'danger' ? 'warning-octagon' : type === 'success' ? 'check-circle' : 'info'}"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
}
