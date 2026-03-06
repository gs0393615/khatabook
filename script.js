// ================= INITIAL SETUP =================

document.addEventListener("DOMContentLoaded", () => {
    updateCurrentDate();
    loadEmployees();
});

let activeEmployeeId = null;
let currentCalendarDate = new Date();
let paymentDate = null;

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

    // Close logo dropdown
    if (!logoDropdown.contains(e.target) && e.target !== logoBtn) {
        logoDropdown.style.display = "none";
    }

    // Close employee modal (only if clicking outside, not on add button)
    if (
        employeeModal.style.display === "flex" &&
        !employeeModal.contains(e.target) &&
        !e.target.classList.contains("add-btn")
    ) {
        closeModal();
    }

    // ✅ BUG FIX: Payment modal no longer closed by this global listener.
    // It is now closed only via closePayment() or its dedicated backdrop click.
});

// ================= NAVIGATION =================

function goHome() {
    window.location.href = "index.html";
}

function goReport() {
    window.location.href = "report.html";
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
    const name = empName.value.trim();
    const wage = Number(dailyWage.value);
    const type = workerType.value;
    const imageFile = empImage.files[0];

    if (!name || !wage) return alert("कृपया सभी फील्ड भरें");

    const reader = new FileReader();

    reader.onload = function () {
        const employee = {
            id: Date.now(),
            name,
            wage,
            type,
            image: reader.result || "",
            attendance: {},
            payments: {}
        };

        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        employees.push(employee);
        localStorage.setItem("employees", JSON.stringify(employees));

        // Reset form fields
        empName.value = "";
        dailyWage.value = "";
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
    labourers.innerHTML = "";

    employees.forEach(emp => createCard(emp));
}

// ================= CREATE CARD =================

function createCard(emp) {
    const card = document.createElement("div");
    card.className = "employee-card";

    if (emp.image) {
        card.style.backgroundImage = `url(${emp.image})`;
        card.style.backgroundSize = "cover";
        card.style.backgroundBlendMode = "overlay";
    }

    const today = new Date().toISOString().split("T")[0];
    let statusColor = "#ccc";
    const todayStatus = emp.attendance[today];

    if (todayStatus === "present") statusColor = "#42f55a";
    if (todayStatus === "absent")  statusColor = "#ed1f0c";

    // Determine which buttons to show (if already marked today)
    const presentHidden = todayStatus === "absent"  ? "visibility:hidden;" : "";
    const absentHidden  = todayStatus === "present" ? "visibility:hidden;" : "";

    // If already marked, show full-width active button
    const presentActive = todayStatus === "present" ? "active" : "";
    const absentActive  = todayStatus === "absent"  ? "active"  : "";
    const presentLabel  = todayStatus === "present" ? "Present" : "P";
    const absentLabel   = todayStatus === "absent"  ? "Absent"  : "A";

    card.innerHTML = `
        <div class="status-dot" style="background:${statusColor}"></div>

        <div class="card-top">
            <div class="card-name">${emp.name}</div>
            <div style="display:flex; gap:8px;">
                <div class="open-btn" title="View Attendance" onclick="openAttendance(${emp.id})">⛶</div>
                <div class="open-btn" title="Delete" onclick="deleteEmployee(${emp.id})">⛝</div>
            </div>
        </div>

        <div class="pa-container">
            <button class="pa-btn present ${presentActive}"
                style="${presentHidden}"
                onclick="handlePA(${emp.id}, 'present', this)">
                ${presentLabel}
            </button>

            <button class="pa-btn absent ${absentActive}"
                style="${absentHidden}"
                onclick="handlePA(${emp.id}, 'absent', this)">
                ${absentLabel}
            </button>
        </div>

        <div class="month-summary">
            ₹ Earned this month: ₹${calculateMonthlyEarned(emp)}
        </div>
    `;

    document.getElementById(emp.type).appendChild(card);
}

// ================= SMART P/A LOGIC =================

function handlePA(id, status, btn) {
    const today = new Date().toISOString().split("T")[0];

    if (!isEditable(today)) {
        alert("केवल उसी हफ्ते में बदलाव हो सकता है");
        return;
    }

    // ✅ BUG FIX: Hide the sibling button immediately
    const container = btn.parentElement;
    const allBtns = container.querySelectorAll(".pa-btn");
    allBtns.forEach(b => {
        if (b !== btn) b.style.visibility = "hidden";
    });

    btn.classList.add("active");
    btn.innerText = status === "present" ? "Present ✓" : "Absent ✗";
    btn.style.visibility = "visible";

    setTimeout(() => {
        updateAttendance(id, today, status);
    }, 3000); // Reduced to 3s for snappier feel
}

function updateAttendance(id, date, status) {
    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees = employees.map(emp => {
        if (emp.id === id) {
            emp.attendance[date] = status;
        }
        return emp;
    });

    localStorage.setItem("employees", JSON.stringify(employees));
    loadEmployees();
}

// ================= WEEKLY EDIT RESTRICTION =================

function isEditable(dateString) {
    const inputDate = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((today - inputDate) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
}

// ================= MONTHLY CALCULATION =================

function calculateMonthlyEarned(emp) {
    const month = new Date().getMonth();
    const year  = new Date().getFullYear();
    let count = 0;

    for (let date in emp.attendance) {
        const d = new Date(date);
        if (
            d.getMonth() === month &&
            d.getFullYear() === year &&
            emp.attendance[date] === "present"
        ) count++;
    }

    return count * emp.wage;
}

// ================= ATTENDANCE SCREEN =================

function openAttendance(id) {
    activeEmployeeId = id;
    currentCalendarDate = new Date(); // reset to current month
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
    const calendar = document.getElementById("calendar");
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

    // Day labels
    const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    dayLabels.forEach(label => {
        const lbl = document.createElement("div");
        lbl.className = "day-label";
        lbl.innerText = label;
        calendar.appendChild(lbl);
    });

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty leading cells
    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.className = "date-cell";
        cell.innerText = day;

        const fullDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        if (emp.attendance[fullDate] === "present") cell.classList.add("present-day");
        if (emp.attendance[fullDate] === "absent")  cell.classList.add("absent-day");
        if (emp.payments[fullDate])                 cell.classList.add("paid-day");

        // ✅ BUG FIX: Stop event propagation so the global document listener
        // does NOT immediately close the payment modal after it opens.
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
    paymentModal.style.display = "flex";

    // Show existing payment amount if any
    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    const emp = employees.find(e => e.id === activeEmployeeId);
    if (emp && emp.payments[date]) {
        paymentAmount.value = emp.payments[date];
    }

    // Focus input after a tiny delay so mobile keyboard opens
    setTimeout(() => paymentAmount.focus(), 50);
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
        if (emp.id === activeEmployeeId) {
            emp.payments[paymentDate] = amount;
        }
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

    // Count attendance for the displayed month only
    for (let date in emp.attendance) {
        const d = new Date(date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            if (emp.attendance[date] === "present") presentCount++;
            if (emp.attendance[date] === "absent")  absentCount++;
        }
    }

    // Total payments (all time)
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
    const confirmDelete = confirm("क्या आप इस कर्मचारी को हटाना चाहते हैं?");
    if (!confirmDelete) return;

    let employees = JSON.parse(localStorage.getItem("employees")) || [];
    employees = employees.filter(emp => emp.id !== id);
    localStorage.setItem("employees", JSON.stringify(employees));
    loadEmployees();
}
        e.target.className !== "add-btn") {
        closeModal();
    }

    if (!paymentModal.contains(e.target)) {
        closePayment();
    }
});

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
    const name = empName.value;
    const wage = Number(dailyWage.value);
    const type = workerType.value;
    const imageFile = empImage.files[0];

    if (!name || !wage) return alert("Fill all fields");

    const reader = new FileReader();

    reader.onload = function () {
        const employee = {
            id: Date.now(),
            name,
            wage,
            type,
            image: reader.result || "",
            attendance: {},
            payments: {},
            wageEditMonth: new Date().getMonth()
        };

        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        employees.push(employee);
        localStorage.setItem("employees", JSON.stringify(employees));

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
    labourers.innerHTML = "";

    employees.forEach(emp => createCard(emp));
}

// ================= CREATE CARD =================

function createCard(emp) {
    const card = document.createElement("div");
    card.className = "employee-card";

    if (emp.image) {
        card.style.backgroundImage = `url(${emp.image})`;
        card.style.backgroundSize = "cover";
        card.style.backgroundBlendMode = "overlay";
    }

    const today = new Date().toISOString().split("T")[0];
    let statusColor = "#ccc";

    if (emp.attendance[today] === "present") statusColor = "green";
    if (emp.attendance[today] === "absent") statusColor = "red";

    card.innerHTML = `
        <div class="status-dot" style="background:${statusColor}"></div>

        <div class="card-top">
    <div class="card-name">${emp.name}</div>

    <div style="display:flex; gap:8px;">
        <div class="open-btn" 
            onclick="openAttendance(${emp.id})">⛶</div>

        <div class="open-btn" 
            onclick="deleteEmployee(${emp.id})">⛝</div>
    </div>
</div>

        <div class="pa-container">
            <button class="pa-btn present" 
                onclick="handlePA(${emp.id}, 'present', this)">
                P
            </button>

            <button class="pa-btn absent" 
                onclick="handlePA(${emp.id}, 'absent', this)">
                A
            </button>
        </div>

        <div class="month-summary">
            ₹ Earned: ₹${calculateMonthlyEarned(emp)}
        </div>
    `;

    document.getElementById(emp.type).appendChild(card);
}

// ================= SMART P/A LOGIC =================

function handlePA(id, status, btn) {

    const today = new Date().toISOString().split("T")[0];

    if (!isEditable(today)) {
        alert("Only editable within same week");
        return;
    }

    btn.classList.add("active");
    btn.innerText = status === "present" ? "Present" : "Absent";

    setTimeout(() => {
        updateAttendance(id, today, status);
    }, 5000);
}

function updateAttendance(id, date, status) {
    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees = employees.map(emp => {
        if (emp.id === id) {
            emp.attendance[date] = status;
        }
        return emp;
    });

    localStorage.setItem("employees", JSON.stringify(employees));
    loadEmployees();
}

// ================= WEEKLY EDIT RESTRICTION =================

function isEditable(dateString) {
    const inputDate = new Date(dateString);
    const today = new Date();

    const diffDays = Math.floor(
        (today - inputDate) / (1000 * 60 * 60 * 24)
    );

    return diffDays <= 7;
}

// ================= MONTHLY CALCULATION =================

function calculateMonthlyEarned(emp) {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    let count = 0;

    for (let date in emp.attendance) {
        const d = new Date(date);
        if (
            d.getMonth() === month &&
            d.getFullYear() === year &&
            emp.attendance[date] === "present"
        ) count++;
    }

    return count * emp.wage;
}

// ================= ATTENDANCE SCREEN =================

function openAttendance(id) {
    activeEmployeeId = id;
    attendanceScreen.style.display = "flex";
    generateCalendar();
}

function closeAttendance() {
    attendanceScreen.style.display = "none";
}

// ================= CHANGE MONTH =================

function changeMonth(offset) {
    currentCalendarDate.setMonth(
        currentCalendarDate.getMonth() + offset
    );
    generateCalendar();
}

// ================= GENERATE CALENDAR =================

function generateCalendar() {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    const emp = employees.find(e => e.id === activeEmployeeId);

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    attendanceMonth.innerText =
        currentCalendarDate.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {

        const cell = document.createElement("div");
        cell.className = "date-cell";
        cell.innerText = day;

        const fullDate = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

        if (emp.attendance[fullDate] === "present")
            cell.classList.add("present-day");

        if (emp.attendance[fullDate] === "absent")
            cell.classList.add("absent-day");

        cell.onclick = () => openPayment(fullDate);

        calendar.appendChild(cell);
    }

    updateSummary(emp);
}

// ================= PAYMENT MODAL =================

function openPayment(date) {
    paymentDate = date;
    paymentModal.style.display = "flex";
}

function closePayment() {
    paymentModal.style.display = "none";
}

function savePayment() {
    const amount = Number(paymentAmount.value);
    if (!amount) return;

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees = employees.map(emp => {
        if (emp.id === activeEmployeeId) {
            emp.payments[paymentDate] = amount;
        }
        return emp;
    });

    localStorage.setItem("employees", JSON.stringify(employees));

    closePayment();
    generateCalendar();
}

// ================= SUMMARY =================

function updateSummary(emp) {
    let presentCount = 0;
    let totalPaid = 0;

    for (let date in emp.attendance) {
        if (emp.attendance[date] === "present")
            presentCount++;
    }

    for (let date in emp.payments) {
        totalPaid += emp.payments[date];
    }

    const earned = presentCount * emp.wage;
    const balance = earned - totalPaid;

    summary.innerHTML = `
        <p>Present Days: ${presentCount}</p>
        <p>Total Earned: ₹${earned}</p>
        <p>Total Paid: ₹${totalPaid}</p>
        <p>Balance: ₹${balance}</p>
    `;
}

// ================= DELETE EMPLOYEE =================

function deleteEmployee(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this employee?"
    );

    if (!confirmDelete) return;

    let employees = JSON.parse(
        localStorage.getItem("employees")
    ) || [];

    employees = employees.filter(emp => emp.id !== id);

    localStorage.setItem("employees", JSON.stringify(employees));

    loadEmployees();
}


function goReport() {
    window.location.href = "report.html";
}
