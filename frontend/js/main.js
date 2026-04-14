// PocketSense AI - Advanced Core Logic
const API_BASE_URL = 'http://localhost:8080/api';
let supabaseClient = null;

// Lifecycle Management
document.addEventListener('DOMContentLoaded', async () => {
    console.log("PocketSense AI: Initializing advanced systems...");
    try {
        await initSupabase();
        setupGlobalNavigation();
        
        const path = window.location.pathname;
        if (path.includes('dashboard.html')) {
            setupDashboard();
            setupBillScan();
            triggerAlertToasts();
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

// 🔐 Authentication & Session
async function initSupabase() {
    try {
        const res = await fetch('/auth-config');
        const config = await res.json();
        if (config.url && config.key && !config.key.includes("YOUR_SUPABASE")) {
            supabaseClient = supabase.createClient(config.url, config.key);
            console.log("Supabase Client initialized successfully.");
        } else {
            console.warn("Supabase configuration incomplete. Auth features will use mock tokens.");
        }
    } catch (e) { console.warn("Supabase auth backend unreachable, using mock."); }
}

async function setupLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const alertBox = document.getElementById('loginAlert');

        try {
            console.log("Attempting sign in...");
            if (supabaseClient) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showToast("Welcome back! ✨", "success");
            } else {
                showToast("Mock Sign-In Successful (No Supabase Keys)", "info");
            }
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        } catch (err) {
            console.error("Login Error:", err.message);
            if (alertBox) {
                alertBox.innerText = err.message;
                alertBox.style.display = 'block';
            }
            showToast("Login Failed", "danger");
        }
    };
}

async function setupSignup() {
    const form = document.getElementById('signupForm');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('nameInput').value;
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const alertBox = document.getElementById('signupAlert');

        try {
            if (supabaseClient) {
                const { data, error } = await supabaseClient.auth.signUp({ 
                    email, 
                    password,
                    options: { data: { full_name: name } }
                });
                if (error) throw error;
                showToast("Account created! Please check your email.", "success");
            } else {
                showToast("Mock Sign-Up Successful (No Supabase Keys)", "info");
            }
            setTimeout(() => window.location.href = 'login.html', 2000);
        } catch (err) {
            console.error("Signup Error:", err.message);
            if (alertBox) {
                alertBox.innerText = err.message;
                alertBox.style.display = 'block';
            }
            showToast("Signup Failed", "danger");
        }
    };
}

async function getUserId() {
    // Priority: Supabase Session -> Default Mock
    if (supabaseClient) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) return user.id;
        } catch (e) {}
    }
    return '123e4567-e89b-12d3-a456-426614174000';
}

// 💰 FEATURE 1: IMPROVED SAVINGS SYSTEM
async function setupSavings() {
    const userId = await getUserId();
    const addSavingForm = document.getElementById('addSavingForm');
    const setGoalForm = document.getElementById('setGoalForm');

    const fetchSavingsData = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/goal/${userId}`);
            const data = await res.json();

            // Progress Bar (Color logic: Red if behind, Gradient if on track)
            const progress = data.progress || 0;
            const bar = document.getElementById('savingsProgressBarFilled');
            if (bar) {
                bar.style.width = `${progress}%`;
                bar.style.background = data.status?.includes('Behind') ? 'var(--accent-danger)' : 'var(--grad-primary)';
            }

            setText('goalPercentageNode', `${Math.round(progress)}%`);
            setText('goalAmountNode', `₹${data.totalSaved?.toLocaleString()} / ₹${data.targetAmount?.toLocaleString()}`);
            
            // Status Badge
            const statusNode = document.getElementById('goalStatusNode');
            if (statusNode) {
                statusNode.innerText = data.status || "On Track ✅";
                statusNode.className = `status-badge ${data.status?.includes('Behind') ? 'status-behind' : 'status-on-track'}`;
            }

            // Cards & Message
            setText('totalSavingsDisplay', `₹${data.totalSaved?.toLocaleString()}`);
            setText('remainingAmountDisplay', `₹${data.remainingAmount?.toLocaleString()}`);
            setText('savingsDailyNeed', `₹${Math.round(data.dailySavingsNeeded || 0)}`);
            setText('savingsDaysLeft', data.daysRemaining || 0);
            setText('savingsDailyMsg', `You need to save ₹${Math.round(data.dailySavingsNeeded || 0)}/day to reach your goal`);

        } catch (e) { showToast("Error connecting to savings engine", "danger"); }
    };

    if (addSavingForm) {
        addSavingForm.onsubmit = async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('savingAmountInput').value);
            const res = await fetch(`${API_BASE_URL}/addSaving`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId, amount, date: new Date().toISOString().split('T')[0] })
            });
            if (res.ok) {
                showToast("Saving logged! 💰", "success");
                addSavingForm.reset();
                fetchSavingsData();
            }
        };
    }

    if (setGoalForm) {
        setGoalForm.onsubmit = async (e) => {
            e.preventDefault();
            const res = await fetch(`${API_BASE_URL}/setGoal`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId,
                    targetAmount: parseFloat(document.getElementById('goalAmountInput').value),
                    deadline: document.getElementById('goalDateInput').value
                })
            });
            if (res.ok) { showToast("New goal synchronized! 🎯", "success"); fetchSavingsData(); }
        };
    }

    fetchSavingsData();
}

// 🧑 FEATURE 2: PROFILE PHOTO UPLOAD
async function setupProfile() {
    const userId = await getUserId();
    const avatarInput = document.getElementById('avatarUploadInput');
    const profileForm = document.getElementById('profileForm');
    const resetBtn = document.getElementById('resetDataBtn');

    const loadProfile = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
            const data = await res.json();
            
            setValue('profileName', data.name);
            setValue('profileEmail', data.email);
            setValue('profileBudget', data.monthlyBudget);
            setValue('profileSavings', data.savingsGoal);

            const display = document.getElementById('profileImageDisplay');
            const placeholder = document.getElementById('profileAvatarPlaceholder');
            if (data.imageUrl) {
                display.src = data.imageUrl;
                display.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                display.style.display = 'none';
                placeholder.style.display = 'flex';
            }
            
            // Badges
            const badgeContainer = document.getElementById('badgesContainer');
            if (badgeContainer) {
                const insightRes = await fetch(`${API_BASE_URL}/insights/${userId}`);
                const insights = await insightRes.json();
                badgeContainer.innerHTML = insights.badges?.map(b => `<div class="badge-card"><i class="ph ph-shield-star text-gradient"></i> ${b}</div>`).join('') || 'No badges earned yet.';
            }
        } catch (e) { console.error("Profile sync error", e); }
    };

    if (avatarInput) {
        avatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file || !supabaseClient) return showToast("Storage unavailable", "danger");
            
            try {
                showToast("Uploading to Supabase...", "info");
                const path = `avatars/${userId}-${Date.now()}.png`;
                const { error } = await supabaseClient.storage.from('profile-images').upload(path, file);
                if (error) throw error;

                const { data: { publicUrl } } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
                
                await fetch(`${API_BASE_URL}/profile`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId, imageUrl: publicUrl })
                });
                
                showToast("Avatar updated! ✨", "success");
                loadProfile();
            } catch (err) { showToast("Upload failed", "danger"); }
        };
    }

    if (profileForm) {
        profileForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                userId,
                name: document.getElementById('profileName').value,
                email: document.getElementById('profileEmail').value,
                monthlyBudget: parseFloat(document.getElementById('profileBudget').value),
                savingsGoal: parseFloat(document.getElementById('profileSavings').value)
            };
            const res = await fetch(`${API_BASE_URL}/profile`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if (res.ok) showToast("Preferences updated!", "success");
        };
    }

    if (resetBtn) {
        resetBtn.onclick = async () => {
            if (confirm("🚨 DANGER: This will wipe all expenses and savings. Continue?")) {
                const res = await fetch(`${API_BASE_URL}/reset/${userId}`, { method: 'DELETE' });
                if (res.ok) { showToast("Data wiped successfully", "info"); location.reload(); }
            }
        };
    }

    loadProfile();
}

// 📷 FEATURE 3: BILL SCANNER
function setupBillScan() {
    const scanBtn = document.getElementById('scanBillBtn');
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraPreview');
    const captureBtn = document.getElementById('captureBtn');
    const confirmBtn = document.getElementById('confirmScanBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const canvas = document.getElementById('cameraCanvas');
    const previewImg = document.getElementById('capturedImage');
    const previewWrap = document.getElementById('capturePreviewContainer');
    const closeBtn = document.getElementById('closeCameraBtn');

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

    if (captureBtn) {
        captureBtn.onclick = () => {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            previewImg.src = canvas.toDataURL('image/png');
            video.style.display = 'none';
            previewWrap.style.display = 'block';
            captureBtn.style.display = 'none';
            confirmBtn.style.display = 'inline-block';
            retakeBtn.style.display = 'inline-block';
        };
    }

    if (retakeBtn) {
        retakeBtn.onclick = () => {
            video.style.display = 'block';
            previewWrap.style.display = 'none';
            captureBtn.style.display = 'inline-block';
            confirmBtn.style.display = 'none';
            retakeBtn.style.display = 'none';
        };
    }

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const val = prompt("Enter bill amount detected:", "0.00");
            if (val && !isNaN(val)) {
                const userId = await getUserId();
                await fetch(`${API_BASE_URL}/addExpense`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ userId, amount: parseFloat(val), category: 'Bills', isRegret: false })
                });
                showToast(`Logged ₹${val} via Scanner`, "success");
                stopCamera();
                if (window.location.pathname.includes('dashboard.html')) setupDashboard();
            }
        };
    }

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        modal.classList.remove('active');
        video.style.display = 'block';
        previewWrap.style.display = 'none';
        captureBtn.style.display = 'inline-block';
        confirmBtn.style.display = 'none';
        retakeBtn.style.display = 'none';
    };

    if (closeBtn) closeBtn.onclick = stopCamera;
}

// 📊 DASHBOARD ENGINE
async function setupDashboard() {
    const userId = await getUserId();
    const greet = document.getElementById('dashGreeting');
    
    try {
        // Analytics Pill
        const analyticsRes = await fetch(`${API_BASE_URL}/analytics/${userId}`);
        const analytics = await analyticsRes.json();
        const analyticsWrap = document.getElementById('analyticsGroup');
        if (analyticsWrap) {
            analyticsWrap.innerHTML = `
                <span class="pill">📈 Monthly Avg: ₹${Math.round(analytics.dailyAverage)}</span>
                <span class="pill">🏆 Top Spend: ${analytics.topCategory}</span>
            `;
        }

        // Budget & Health
        const [budgetRes, healthRes] = await Promise.all([
            fetch(`${API_BASE_URL}/budget/${userId}`),
            fetch(`${API_BASE_URL}/health/${userId}`)
        ]);
        const bData = await budgetRes.json();
        const hData = await healthRes.json();

        setText('dashTodaySpend', `₹${bData.spent?.toLocaleString()}`);
        setText('dashBudgetRemaining', `₹${bData.remaining?.toLocaleString()}`);
        setText('dashHealthScore', hData.score);
        setText('dashHealthStatus', hData.status);
        setText('dashHealthMessage', hData.message);

        // Savings Goal Sync
        const goalRes = await fetch(`${API_BASE_URL}/goal/${userId}`);
        const gData = await goalRes.json();
        setText('dashGoalSpend', `₹${gData.totalSaved?.toLocaleString()} / ₹${gData.targetAmount?.toLocaleString()}`);

        // Predictions & Regret
        const insightsRes = await fetch(`${API_BASE_URL}/insights/${userId}`);
        const iData = await insightsRes.json();
        setText('dashPredictionAmount', `₹${Math.round(bData.spent * 1.2)}`); // Simplified prediction
        setText('dashPredictionMessage', `Based on ${iData.trend} trend`);
        
        // Expenses List
        const expRes = await fetch(`${API_BASE_URL}/expenses/${userId}`);
        const expenses = await expRes.json();
        renderExpenses(expenses);

    } catch (e) { console.error("Dashboard engine failed", e); }
}

// 🧩 INSIGHTS ENGINE
async function setupInsights() {
    const userId = await getUserId();
    try {
        const res = await fetch(`${API_BASE_URL}/insights/${userId}`);
        const data = await res.json();
        
        setText('insightPrimaryTitle', data.personality || "Economic Observer");
        setText('insightPrimaryDesc', data.message || "Log more expenses to unlock AI personality profiles.");
        setText('insightStat1', data.topCategory || "N/A");
        setText('insightStat2', data.trend || "Neutral");
        
        const ctx = document.getElementById('spendChart')?.getContext('2d');
        if (ctx) {
            const expRes = await fetch(`${API_BASE_URL}/expenses/${userId}`);
            const expenses = await expRes.json();
            const groups = expenses.reduce((acc, obj) => {
                acc[obj.category] = (acc[obj.category] || 0) + obj.amount;
                return acc;
            }, {});
            
            new Chart(ctx, {
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
    } catch (e) { console.error("Insights failed", e); }
}

// 🔔 REAL-TIME ALERTS
async function triggerAlertToasts() {
    const userId = await getUserId();
    try {
        const res = await fetch(`${API_BASE_URL}/alerts/${userId}`);
        const alerts = await res.json();
        const container = document.getElementById('dashAlertsContainer');
        
        if (container) container.innerHTML = '';
        alerts.forEach((alert, i) => {
            // Render on dashboard
            if (container) {
                const div = document.createElement('div');
                div.className = 'alert-item';
                div.style.animationDelay = `${i * 0.1}s`;
                div.innerHTML = `<div class="alert-icon danger"><i class="ph ph-warning"></i></div><div class="alert-content"><h4>${alert.type || 'Alert'}</h4><p>${alert.message}</p></div>`;
                container.appendChild(div);
            }
            // Trigger Toast for critical issues
            if (i === 0) showToast(`⚠️ ${alert.message}`, "danger");
        });
    } catch (e) {}
}

// 🛠 UTILITIES
function setText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }

function showToast(msg, type = "info") {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed; top:2rem; right:2rem; padding:1rem 1.5rem; border-radius:12px; color:#fff; font-weight:600; z-index:10000; display:flex; align-items:center; gap:0.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.3); animation:slideInToast 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; background:${type === 'danger' ? '#F43F5E' : type === 'success' ? '#10B981' : '#6366F1'}`;
    toast.innerHTML = `<i class="ph ph-${type === 'danger' ? 'warning-octagon' : type === 'success' ? 'check-circle' : 'info'}"></i> ${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3000);
}

function setupGlobalNavigation() {
    const fab = document.getElementById('fabAddModal');
    const modal = document.getElementById('expenseModal');
    const close = document.getElementById('closeModalBtn');
    const submit = document.getElementById('submitExpenseBtn');

    if (fab) fab.onclick = () => modal.classList.add('active');
    if (close) close.onclick = () => modal.classList.remove('active');
    
    // Logout Logic
    const logoutBtn = document.querySelector('[aria-label="Logout"]') || document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (supabaseClient) await supabaseClient.auth.signOut();
            showToast("Signed out", "info");
            setTimeout(() => window.location.href = 'login.html', 500);
        };
    }

    if (submit) {
        submit.onclick = async () => {
            const amount = parseFloat(document.getElementById('expenseAmount').value);
            const category = document.querySelector('.category-select.active')?.innerText || "Food";
            if (!amount) return showToast("Please enter an amount", "danger");
            
            const res = await fetch(`${API_BASE_URL}/addExpense`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: await getUserId(), amount, category, isRegret: false })
            });

            if (res.ok) {
                showToast("Transaction Logged! 💳", "success");
                modal.classList.remove('active');
                if (window.location.pathname.includes('dashboard.html')) setupDashboard();
            }
        };
    }

    document.querySelectorAll('.category-select').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.category-select').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
}

function renderExpenses(expenses) {
    const list = document.getElementById('dashPillGroup');
    if (!list) return;
    list.innerHTML = expenses.length ? '' : '<p class="text-secondary text-sm">No recent transactions.</p>';
    expenses.slice(0, 4).forEach(ex => {
        const item = document.createElement('div');
        item.className = 'pill';
        item.innerHTML = `<span>${ex.category}</span><span class="font-bold">₹${ex.amount.toLocaleString()}</span><button onclick="deleteExpense('${ex.id}')" style="background:none; border:none; color:var(--accent-danger); cursor:pointer;"><i class="ph ph-trash"></i></button>`;
        list.appendChild(item);
    });
}

async function deleteExpense(id) {
    if (confirm("Delete this expense?")) {
        const res = await fetch(`${API_BASE_URL}/expense/${id}`, { method: 'DELETE' });
        if (res.ok) { showToast("Deleted", "info"); setupDashboard(); }
    }
}
