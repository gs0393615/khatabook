// ================= INITIAL SETUP =================

document.addEventListener("DOMContentLoaded", () => {
    updateCurrentDate();
    loadEmployees();
});

let activeEmployeeId = null;
let currentCalendarDate = new Date();
let paymentDate = null;
let confirmCallback = null;

// ================= LOCAL DATE HELPER (fixes UTC off-by-one bug) =================

function getLocalDateString(date) {
    const d = date || new Date();
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day   = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// ================= CURRENT DATE =================

function updateCurrentDate() {
    const today = new Date();
    document.getElementById("currentDate").innerText =
        today.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

// ================= LOGO DROPDOWN =================

logoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    logoDropdown.style.display = "flex";
});

// ================= CLOSE ON OUTSIDE CLICK =================

document.addEventListener("click", (e) => {

    if (!logoDropdown.contains(e.target) && e.target !== logoBtn) {
        logoDropdown.style.display = "none";
    }

    if (
        employeeModal.style.display === "flex" &&
        !employeeModal.contains(e.target) &&
        !e.target.classList.contains("add-btn")
    ) {
        closeModal();
    }
});

// ================= NAVIGATION =================

function goHome() {
    window.location.href = "index.html";
}

function goReport() {
    window.location.href = "report.html";
}

// ================= SEARCH FILTER =================

function filterEmployees(query) {
    const cards = document.querySelectorAll(".employee-card");
    const q = query.toLowerCase().trim();
    cards.forEach(card => {
        const name = card.querySelector(".card-name").innerText.toLowerCase();
        card.style.display = (!q || name.includes(q)) ? "" : "none";
    });
}

// ================= WORKER SECTION TOGGLE =================

function toggleSection(id, header) {
    const grid = document.getElementById(id);
    const arrow = header.querySelector(".arrow");

    if (grid.style.maxHeight) {
        grid.style.maxHeight = null;
        arrow.style.transform = "rotate(0deg)";
    } else {
        grid.style.maxHeight = grid.scrollHeight + "px";
        arrow.style.transform = "rotate(180deg)";
    }
}

// ================= AVATAR GENERATOR =================

function generateAvatar(name, id) {
    // Derive unique hue from name characters
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = Math.abs(hash);

    const hue1 = hash % 360;
    const hue2 = (hue1 + 40) % 360;
    const hue3 = (hue1 + 80) % 360;

    const c1 = `hsl(${hue1},70%,55%)`;
    const c2 = `hsl(${hue2},65%,45%)`;
    const c3 = `hsl(${hue3},75%,65%)`;

    // Shape variety from id
    const variant = id % 4;

    const shapes = {
        0: `
            <circle cx="100" cy="60"  r="50" fill="${c1}" opacity="0.85"/>
            <circle cx="40"  cy="120" r="40" fill="${c2}" opacity="0.75"/>
            <circle cx="150" cy="130" r="55" fill="${c3}" opacity="0.6"/>
            <circle cx="100" cy="100" r="28" fill="white" opacity="0.15"/>`,
        1: `
            <polygon points="100,10 180,170 20,170"  fill="${c1}" opacity="0.85"/>
            <polygon points="20,20  160,20  90,180"  fill="${c2}" opacity="0.6"/>
            <circle  cx="100" cy="100" r="32"        fill="${c3}" opacity="0.55"/>`,
        2: `
            <rect x="10"  y="10"  width="90"  height="90"  rx="16" fill="${c1}" opacity="0.85"/>
            <rect x="70"  y="70"  width="110" height="110" rx="20" fill="${c2}" opacity="0.7"/>
            <rect x="30"  y="100" width="70"  height="70"  rx="12" fill="${c3}" opacity="0.55"/>`,
        3: `
            <ellipse cx="80"  cy="80"  rx="70" ry="50" fill="${c1}" opacity="0.85"/>
            <ellipse cx="120" cy="130" rx="55" ry="45" fill="${c2}" opacity="0.7"/>
            <ellipse cx="60"  cy="150" rx="50" ry="30" fill="${c3}" opacity="0.55"/>`
    };

    const initials = name.trim().split(" ").map(w => w[0].toUpperCase()).slice(0, 2).join("");

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stop-color="hsl(${hue1},30%,92%)"/>
                    <stop offset="100%" stop-color="hsl(${hue2},35%,85%)"/>
                </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#bg)"/>
            ${shapes[variant]}
            <text x="100" y="108" font-family="Arial Black, sans-serif"
                  font-size="52" font-weight="900" text-anchor="middle"
                  fill="white" opacity="0.95"
                  style="text-shadow:0 2px 8px rgba(0,0,0,0.3)">${initials}</text>
        </svg>
    `)}`;
}

// ================= ADD EMPLOYEE =================

function openAddEmployee() {
    document.getElementById("employeeModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("employeeModal").style.display = "none";
}

function saveEmployee() {
    const name  = empName.value.trim();
    const wage  = Number(dailyWage.value);
    const phone = empPhone.value.trim();
    const type  = workerType.value;

    if (!name || !wage) return alert("कृपया सभी फील्ड भरें");

    const id = Date.now();
    const employee = {
        id,
        name,
        phone,
        wage,
        type,
        attendance: {},
        payments:   {}
    };

    let employees = JSON.parse(localStorage.getItem("employees")) || [];
    employees.push(employee);
    localStorage.setItem("employees", JSON.stringify(employees));

    empName.value   = "";
    dailyWage.value = "";
    empPhone.value  = "";

    closeModal();
    loadEmployees();
}

// ================= LOAD EMPLOYEES =================

function loadEmployees() {
    const employees = JSON.parse(localStorage.getItem("employees")) || [];

    headWorkers.innerHTML = "";
    labourers.innerHTML   = "";

    employees.forEach(emp => createCard(emp));
}

// ================= CREATE CARD =================

function createCard(emp) {
    const card = document.createElement("div");
    card.className = "employee-card";

    // Auto-generated avatar as card background
    const avatarUrl = generateAvatar(emp.name, emp.id);
    card.style.backgroundImage    = `url("${avatarUrl}")`;
    card.style.backgroundSize     = "cover";
    card.style.backgroundPosition = "center";
    card.style.backgroundBlendMode = "overlay";

    const today = getLocalDateString();
    let statusColor = "#ccc";
    const todayStatus = emp.attendance[today];

    if (todayStatus === "present") statusColor = "#42f55a";
    if (todayStatus === "absent")  statusColor = "#ed1f0c";

    const presentHidden = todayStatus === "absent"  ? "visibility:hidden;" : "";
    const absentHidden  = todayStatus === "present" ? "visibility:hidden;" : "";
    const presentActive = todayStatus === "present" ? "active" : "";
    const absentActive  = todayStatus === "absent"  ? "active"  : "";
    const presentLabel  = todayStatus === "present" ? "Present ✓" : "P";
    const absentLabel   = todayStatus === "absent"  ? "Absent ✗"  : "A";

    // Escape name for use in onclick attribute
    const safeName = emp.name.replace(/'/g, "\\'");

    card.innerHTML = `
        <div class="status-dot" style="background:${statusColor}"></div>

        <div class="card-top">
            <div class="card-info">
                <div class="card-name">${emp.name}</div>
                ${emp.phone ? `<div class="card-phone">📞 ${emp.phone}</div>` : ""}
            </div>
            <div style="display:flex; gap:8px;">
                <div class="open-btn" title="View Attendance" onclick="openAttendance(${emp.id})">⛶</div>
                <div class="open-btn" title="Delete" onclick="deleteEmployee(${emp.id})">⛝</div>
            </div>
        </div>

        <div class="pa-container">
            <button class="pa-btn present ${presentActive}"
                style="${presentHidden}"
                onclick="handlePA(${emp.id}, 'present', this, '${safeName}')">
                ${presentLabel}
            </button>

            <button class="pa-btn absent ${absentActive}"
                style="${absentHidden}"
                onclick="handlePA(${emp.id}, 'absent', this, '${safeName}')">
                ${absentLabel}
            </button>
        </div>

        <div class="month-summary">
            ₹ Earned this month: ₹${calculateMonthlyEarned(emp)}
        </div>
    `;

    document.getElementById(emp.type).appendChild(card);
}

// ================= CUSTOM CONFIRM DIALOG =================

function showConfirm(message, onYes) {
    document.getElementById("confirmMsg").innerText = message;
    document.getElementById("confirmModal").style.display = "flex";
    confirmCallback = onYes;
}

function acceptConfirm() {
    document.getElementById("confirmModal").style.display = "none";
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
}

function closeConfirm() {
    document.getElementById("confirmModal").style.display = "none";
    confirmCallback = null;
}

// ================= SMART P/A LOGIC =================

function handlePA(id, status, btn, name) {
    const today = getLocalDateString();

    if (!isEditable(today)) {
        alert("केवल उसी हफ्ते में बदलाव हो सकता है");
        return;
    }

    const emoji = status === "present" ? "✅" : "❌";
    const label = status === "present" ? "Present" : "Absent";

    showConfirm(`${emoji} क्या ${name} को आज ${label} मार्क करें?`, () => {
        const container = btn.parentElement;
        const allBtns   = container.querySelectorAll(".pa-btn");
        allBtns.forEach(b => {
            if (b !== btn) b.style.visibility = "hidden";
        });

        btn.classList.add("active");
        btn.innerText = status === "present" ? "Present ✓" : "Absent ✗";
        btn.style.visibility = "visible";

        setTimeout(() => {
            updateAttendance(id, today, status);
        }, 2000);
    });
}

function updateAttendance(id, date, status) {
    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees = employees.map(emp => {
        if (emp.id === id) emp.attendance[date] = status;
        return emp;
    });

    localStorage.setItem("employees", JSON.stringify(employees));
    loadEmployees();
}

// ================= WEEKLY EDIT RESTRICTION =================

function isEditable(dateString) {
    const inputDate = new Date(dateString);
    const today     = new Date();
    const diffDays  = Math.floor((today - inputDate) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

// ================= MONTHLY CALCULATION =================

function calculateMonthlyEarned(emp) {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();
    let count   = 0;

    for (let date in emp.attendance) {
        const d = new Date(date);
        if (d.getMonth() === month && d.getFullYear() === year && emp.attendance[date] === "present")
            count++;
    }

    return count * emp.wage;
}

// ================= ATTENDANCE SCREEN =================

function openAttendance(id) {
    activeEmployeeId    = id;
    currentCalendarDate = new Date();
    attendanceScreen.style.display = "flex";
    generateCalendar();
}

function closeAttendance() {
    attendanceScreen.style.display = "none";
}

// ================= CHANGE MONTH =================

function changeMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    generateCalendar();
}

// ================= GENERATE CALENDAR =================

function generateCalendar() {
    const calendar  = document.getElementById("calendar");
    calendar.innerHTML = "";

    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    const emp = employees.find(e => e.id === activeEmployeeId);
    if (!emp) return;

    const year  = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    attendanceMonth.innerText = currentCalendarDate.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });

    const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    dayLabels.forEach(label => {
        const lbl = document.createElement("div");
        lbl.className  = "day-label";
        lbl.innerText  = label;
        calendar.appendChild(lbl);
    });

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.className = "date-cell";

        const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        // Day number
        const dayNum = document.createElement("span");
        dayNum.innerText = day;
        cell.appendChild(dayNum);

        if (emp.attendance[fullDate] === "present") cell.classList.add("present-day");
        if (emp.attendance[fullDate] === "absent")  cell.classList.add("absent-day");

        // ✅ Golden dot for paid days
        if (emp.payments[fullDate]) {
            cell.classList.add("paid-day");
            const dot = document.createElement("span");
            dot.className = "payment-dot";
            cell.appendChild(dot);
        }

        cell.onclick = (e) => {
            e.stopPropagation();
            openPayment(fullDate);
        };

        calendar.appendChild(cell);
    }

    updateSummary(emp, year, month);
}

// ================= PAYMENT MODAL =================

function openPayment(date) {
    paymentDate = date;
    paymentAmount.value = "";

    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    const emp = employees.find(e => e.id === activeEmployeeId);
    if (emp && emp.payments[date]) {
        paymentAmount.value = emp.payments[date];
    }

    // Use block (not flex) so the box's own fixed centering works
    paymentModal.style.display = "block";
}

function closePayment() {
    paymentModal.style.display = "none";
    paymentAmount.value = "";
}

function savePayment() {
    const amount = Number(paymentAmount.value);
    if (!amount || amount < 0) return alert("कृपया सही राशि दर्ज करें");

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees = employees.map(emp => {
        if (emp.id === activeEmployeeId) emp.payments[paymentDate] = amount;
        return emp;
    });

    localStorage.setItem("employees", JSON.stringify(employees));
    closePayment();
    generateCalendar();
}

// ================= SUMMARY =================

function updateSummary(emp, year, month) {
    let presentCount = 0;
    let absentCount  = 0;
    let totalPaid    = 0;

    for (let date in emp.attendance) {
        const [y, m] = date.split("-").map(Number);
        if (m - 1 === month && y === year) {
            if (emp.attendance[date] === "present") presentCount++;
            if (emp.attendance[date] === "absent")  absentCount++;
        }
    }

    // ✅ FIX: Parse date string directly to avoid UTC timezone month-shift bug
    for (let date in emp.payments) {
        const [y, m] = date.split("-").map(Number);
        if (m - 1 === month && y === year)
            totalPaid += emp.payments[date];
    }

    const earned  = presentCount * emp.wage;
    const balance = earned - totalPaid;

    summary.innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <span class="s-label">✅ Present</span>
                <span class="s-value">${presentCount} days</span>
            </div>
            <div class="summary-item">
                <span class="s-label">❌ Absent</span>
                <span class="s-value">${absentCount} days</span>
            </div>
            <div class="summary-item">
                <span class="s-label">💰 Earned</span>
                <span class="s-value">₹${earned}</span>
            </div>
            <div class="summary-item">
                <span class="s-label">💸 Paid</span>
                <span class="s-value">₹${totalPaid}</span>
            </div>
            <div class="summary-item summary-balance">
                <span class="s-label">⚖️ Balance</span>
                <span class="s-value" style="color:${balance >= 0 ? '#2a7d4f' : '#c0392b'}">₹${balance}</span>
            </div>
        </div>
    `;
}

// ================= DELETE EMPLOYEE =================

function deleteEmployee(id) {
    showConfirm("⚠️ क्या आप इस कर्मचारी को हटाना चाहते हैं?", () => {
        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        employees = employees.filter(emp => emp.id !== id);
        localStorage.setItem("employees", JSON.stringify(employees));
        loadEmployees();
    });
}

// ================= PWA INSTALL PROMPT =================

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show install banner if not already installed
    if (!localStorage.getItem('pwaInstalled')) {
        showInstallBanner();
    }
});

window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwaInstalled', '1');
    hideInstallBanner();
});

function showInstallBanner() {
    if (document.getElementById('installBanner')) return;
    const banner = document.createElement('div');
    banner.id = 'installBanner';
    banner.style.cssText = `
        position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
        background: #ffde59; border: 3px solid #000; border-radius: 12px;
        box-shadow: 4px 4px 0 #000; padding: 12px 18px;
        display: flex; align-items: center; gap: 12px;
        z-index: 9999; font-family: 'Arial Black', sans-serif;
        font-size: 13px; white-space: nowrap;
    `;
    banner.innerHTML = `
        <span>📲 Install as Android App</span>
        <button onclick="installPWA()" style="
            background:#000; color:#ffde59; border:none;
            border-radius:8px; padding:6px 14px;
            font-weight:bold; cursor:pointer; font-size:13px;">
            Install
        </button>
        <button onclick="hideInstallBanner()" style="
            background:transparent; border:none;
            font-size:18px; cursor:pointer; line-height:1;">✕</button>
    `;
    document.body.appendChild(banner);
}

function hideInstallBanner() {
    const b = document.getElementById('installBanner');
    if (b) b.remove();
}

function installPWA() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
            localStorage.setItem('pwaInstalled', '1');
        }
        deferredInstallPrompt = null;
        hideInstallBanner();
    });
}

// ================= BACKUP & RESTORE =================

function exportBackup() {
    const employees = localStorage.getItem("employees") || "[]";
    const now = new Date();
    const dateStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    const fileName = "khatabook-backup-" + dateStr + ".json";

    // Method 1: data URI download (most compatible on Android)
    try {
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(employees);
        const a = document.createElement("a");
        a.href = dataUri;
        a.download = fileName;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 500);
    } catch(e) {}

    // Always also show the copy-text modal as a guaranteed fallback
    setTimeout(() => showBackupTextModal(employees, fileName), 800);
}

function showBackupTextModal(data, fileName) {
    const existing = document.getElementById("backupTextModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "backupTextModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;";
    modal.innerHTML = `
        <div style="background:#ffde59;border:3px solid #000;border-radius:12px;box-shadow:5px 5px 0 #000;padding:20px;width:100%;max-width:420px;">
            <h3 style="font-family:'Arial Black',sans-serif;margin-bottom:10px;">&#x1F4BE; Backup Ready</h3>
            <p style="font-size:13px;margin-bottom:10px;">If download did not start automatically, copy the text below and save it in WhatsApp or Notes app.</p>
            <textarea id="backupTextArea" style="width:100%;height:120px;font-size:11px;border:2px solid #000;border-radius:8px;padding:8px;resize:none;font-family:monospace;" readonly></textarea>
            <div style="display:flex;gap:10px;margin-top:12px;">
                <button onclick="document.getElementById('backupTextArea').select();document.execCommand('copy');this.innerText='Copied!';" style="flex:1;background:#000;color:#ffde59;border:none;border-radius:8px;padding:10px;font-weight:bold;font-size:14px;cursor:pointer;">Copy All</button>
                <button onclick="document.getElementById('backupTextModal').remove();" style="flex:1;background:#fff;border:2px solid #000;border-radius:8px;padding:10px;font-weight:bold;font-size:14px;cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => {
        const ta = document.getElementById("backupTextArea");
        if (ta) { ta.value = data; ta.select(); }
    }, 100);
}

function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Invalid format");
            doRestore(data);
        } catch {
            alert("Invalid backup file. Please use a valid backup.");
        }
    };
    reader.readAsText(file);
    input.value = "";
}

// ================= RESTORE FROM PASTED TEXT =================

function importBackup() {
    const existing = document.getElementById("restoreModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "restoreModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;";
    modal.innerHTML = `
        <div style="background:#ffde59;border:3px solid #000;border-radius:12px;box-shadow:5px 5px 0 #000;padding:20px;width:100%;max-width:420px;">
            <h3 style="font-family:'Arial Black',sans-serif;margin-bottom:14px;">&#x1F4C2; Restore Backup</h3>
            <button onclick="document.getElementById('importFileInput').click();document.getElementById('restoreModal').remove();"
                style="width:100%;background:#000;color:#ffde59;border:none;border-radius:8px;padding:12px;font-weight:bold;font-size:15px;cursor:pointer;margin-bottom:10px;">
                &#x1F4C1; Choose Backup File (.json)
            </button>
            <p style="text-align:center;font-size:13px;margin:8px 0;">&#x2014; OR &#x2014;</p>
            <p style="font-size:13px;margin-bottom:6px;">Paste your copied backup text here:</p>
            <textarea id="pasteRestoreArea" placeholder="Paste backup text here..." style="width:100%;height:100px;font-size:11px;border:2px solid #000;border-radius:8px;padding:8px;resize:none;font-family:monospace;"></textarea>
            <div style="display:flex;gap:10px;margin-top:12px;">
                <button onclick="restoreFromPaste()" style="flex:1;background:#000;color:#ffde59;border:none;border-radius:8px;padding:10px;font-weight:bold;font-size:14px;cursor:pointer;">&#x2705; Restore</button>
                <button onclick="document.getElementById('restoreModal').remove();" style="flex:1;background:#fff;border:2px solid #000;border-radius:8px;padding:10px;font-weight:bold;font-size:14px;cursor:pointer;">&#x2715; Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function restoreFromPaste() {
    const text = (document.getElementById("pasteRestoreArea").value || "").trim();
    if (!text) { alert("Please paste your backup text first."); return; }
    try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("Invalid");
        document.getElementById("restoreModal").remove();
        doRestore(data);
    } catch(e) {
        alert("Invalid backup text. Please make sure you copied the full backup and try again.");
    }
}

// ================= SAFE RESTORE CORE =================
// Uses its own confirm UI — does NOT share confirmCallback with other dialogs

function doRestore(data) {
    // Snapshot current data BEFORE touching anything
    const safetyBackup = localStorage.getItem("employees") || "[]";

    // Show a self-contained confirm inside a new modal
    const existing = document.getElementById("restoreConfirmModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "restoreConfirmModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;";
    modal.innerHTML = `
        <div style="background:#ffde59;border:3px solid #000;border-radius:12px;box-shadow:5px 5px 0 #000;padding:22px;width:100%;max-width:380px;text-align:center;">
            <div style="font-size:36px;margin-bottom:10px;">&#x26A0;&#xFE0F;</div>
            <p style="font-family:'Arial Black',sans-serif;font-size:15px;margin-bottom:6px;">Restore ${data.length} employees?</p>
            <p style="font-size:13px;color:#333;margin-bottom:18px;">Current data will be replaced. This cannot be undone.</p>
            <div style="display:flex;gap:10px;">
                <button id="restoreYesBtn" style="flex:1;background:#000;color:#ffde59;border:none;border-radius:8px;padding:12px;font-weight:bold;font-size:15px;cursor:pointer;">&#x2705; Yes, Restore</button>
                <button onclick="document.getElementById('restoreConfirmModal').remove();" style="flex:1;background:#fff;border:2px solid #000;border-radius:8px;padding:12px;font-weight:bold;font-size:15px;cursor:pointer;">&#x2715; Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Attach click handler directly on the button — no shared global state
    document.getElementById("restoreYesBtn").addEventListener("click", function() {
        try {
            localStorage.setItem("employees", JSON.stringify(data));

            // Verify the write actually worked
            const verify = JSON.parse(localStorage.getItem("employees") || "[]");
            if (!Array.isArray(verify) || verify.length !== data.length) {
                throw new Error("Write verification failed");
            }

            document.getElementById("restoreConfirmModal").remove();
            loadEmployees();
            alert("Restored " + data.length + " employees successfully!");

        } catch(err) {
            // Something went wrong — put the original data back
            localStorage.setItem("employees", safetyBackup);
            document.getElementById("restoreConfirmModal").remove();
            loadEmployees();
            alert("Restore failed. Your original data has been kept safe.");
        }
    });
}
