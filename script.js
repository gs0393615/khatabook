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

// Close when clicking outside
document.addEventListener("click", (e) => {
    if (!logoDropdown.contains(e.target) && e.target !== logoBtn) {
        logoDropdown.style.display = "none";
    }

    if (!employeeModal.contains(e.target) && 
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
