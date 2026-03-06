// ================= INITIAL SETUP =================

document.addEventListener("DOMContentLoaded", () => {
    updateCurrentDate();
    loadEmployees();
});

let activeEmployeeId = null;
let currentCalendarDate = new Date();
let paymentDate = null;
let confirmCallback = null;

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
    const imageFile = empImage.files[0];

    if (!name || !wage) return alert("कृपया सभी फील्ड भरें");

    const reader = new FileReader();

    reader.onload = function () {
        const employee = {
            id: Date.now(),
            name,
            phone,
            wage,
            type,
            image: reader.result || "",
            attendance: {},
            payments: {}
        };

        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        employees.push(employee);
        localStorage.setItem("employees", JSON.stringify(employees));

        empName.value  = "";
        dailyWage.value = "";
        empPhone.value = "";
        empImage.value = "";

        closeModal();
        loadEmployees();
    };

    if (imageFile) reader.readAsDataURL(imageFile);
    else reader.onload();
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

    if (emp.image) {
        card.style.backgroundImage  = `url(${emp.image})`;
        card.style.backgroundSize   = "cover";
        card.style.backgroundBlendMode = "overlay";
    }

    const today = new Date().toISOString().split("T")[0];
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
    const today = new Date().toISOString().split("T")[0];

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
    const month = new Date().getMonth();
    const year  = new Date().getFullYear();
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
        const d = new Date(date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            if (emp.attendance[date] === "present") presentCount++;
            if (emp.attendance[date] === "absent")  absentCount++;
        }
    }

    for (let date in emp.payments) {
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
