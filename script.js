const monthElement = document.getElementById("currentMonth");
const now = new Date();
const options = { month: 'long', year: 'numeric' };
monthElement.innerText = now.toLocaleDateString('en-US', options);

document.addEventListener("DOMContentLoaded", loadEmployees);

let activeEmployeeId = null;

function toggleSection(id) {
    const section = document.getElementById(id);
    section.style.display = section.style.display === "none" ? "grid" : "none";
}

function openAddEmployee() {
    document.getElementById("employeeModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("employeeModal").style.display = "none";
}

function saveEmployee() {
    const name = document.getElementById("empName").value;
    const wage = document.getElementById("dailyWage").value;
    const type = document.getElementById("workerType").value;
    const imageInput = document.getElementById("empImage");

    if (!name || !wage) {
        alert("Fill all fields");
        return;
    }

    const reader = new FileReader();
    reader.onload = function () {
        const employee = {
            id: Date.now(),
            name,
            wage: Number(wage),
            type,
            image: reader.result || "",
            attendance: {},
            payments: {}
        };

        let employees = JSON.parse(localStorage.getItem("employees")) || [];
        employees.push(employee);
        localStorage.setItem("employees", JSON.stringify(employees));

        closeModal();
        loadEmployees();
    };

    if (imageInput.files[0]) {
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        reader.onload();
    }
}

function loadEmployees() {
    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    document.getElementById("headWorkers").innerHTML = "";
    document.getElementById("labourers").innerHTML = "";

    employees.forEach(emp => createCard(emp));
}

function createCard(emp) {
    const card = document.createElement("div");
    card.className = "employee-card";
    card.style.backgroundImage = emp.image ? `url(${emp.image})` : "none";
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
    card.style.backgroundColor = "rgba(255,255,255,0.85)";
    card.style.backgroundBlendMode = "overlay";

    card.innerHTML = `
        <h3>${emp.name}</h3>
        <div class="salary">Daily Wage: ₹${emp.wage}</div>
        <div class="button-group">
            <button class="present-btn" onclick="quickPresent(${emp.id})">P</button>
            <button class="absent-btn" onclick="quickAbsent(${emp.id})">A</button>
            <button onclick="openAttendance(${emp.id})">↗</button>
        </div>
    `;

    document.getElementById(emp.type).appendChild(card);
}

function quickPresent(id) {
    const today = new Date().toISOString().split('T')[0];
    updateAttendance(id, today, "present");
}

function quickAbsent(id) {
    const today = new Date().toISOString().split('T')[0];
    updateAttendance(id, today, "absent");
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

function openAttendance(id) {
    activeEmployeeId = id;
    document.getElementById("attendanceScreen").style.display = "flex";
    generateCalendar();
}

function closeAttendance() {
    document.getElementById("attendanceScreen").style.display = "none";
}

function generateCalendar() {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    const employees = JSON.parse(localStorage.getItem("employees")) || [];
    const emp = employees.find(e => e.id === activeEmployeeId);

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    document.getElementById("attendanceMonth").innerText =
        date.toLocaleDateString('en-US', options);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    dayNames.forEach(day => {
        const d = document.createElement("div");
        d.className = "day-name";
        d.innerText = day;
        calendar.appendChild(d);
    });

    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        const fullDate = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

        cell.className = "date-cell";
        cell.innerText = day;

        if (emp.attendance[fullDate] === "present")
            cell.classList.add("present");
        if (emp.attendance[fullDate] === "absent")
            cell.classList.add("absent");

        if (emp.payments[fullDate]) {
            const dot = document.createElement("div");
            dot.className = "golden-dot";
            cell.appendChild(dot);
        }

        cell.onclick = () => addPayment(fullDate);

        calendar.appendChild(cell);
    }

    updateSummary(emp);
}

function addPayment(date) {
    const amount = prompt("Enter payment amount:");
    if (!amount) return;

    let employees = JSON.parse(localStorage.getItem("employees")) || [];

    employees = employees.map(emp => {
        if (emp.id === activeEmployeeId) {
            emp.payments[date] = Number(amount);
        }
        return emp;
    });

    localStorage.setItem("employees", JSON.stringify(employees));
    generateCalendar();
}

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

    const totalEarned = presentCount * emp.wage;
    const balance = totalEarned - totalPaid;

    document.getElementById("summary").innerHTML = `
        <hr>
        <p>Present Days: ${presentCount}</p>
        <p>Total Earned: ₹${totalEarned}</p>
        <p>Total Paid: ₹${totalPaid}</p>
        <p>Balance: ₹${balance}</p>
    `;
}
