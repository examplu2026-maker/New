// ============================================================
// EXAMPLUS — panel content
// renderPanel() returns the HTML for a section.
// wirePanel() attaches event listeners once that section is shown.
// Split this way so panels.js is the only file you touch when
// adding a new screen — app.js and the nav config stay untouched.
// ============================================================

function renderPanel(id, session) {
  switch (id) {
    case "overview": return renderOverview(session);
    case "schools": return renderSchools();
    case "students": return renderStudents();
    case "scores": return renderScores(session);
    case "reportcards": return renderReportCards();
    case "promotion": return renderPromotion();
    case "fees": return renderFees(session);
    case "addclass": return renderAddClass();
    case "addteacher": return renderAddStaff("Teacher");
    case "addbursar": return renderAddStaff("Bursar");
    case "schooldetails": return renderSchoolDetails();
    case "assessment": return renderAssessment();
    default: return `<div class="card"><p>Nothing here yet.</p></div>`;
  }
}

function wirePanel(id, session) {
  switch (id) {
    case "schools": return wireSchools(session);
    case "students": return wireStudents(session);
    case "scores": return wireScores(session);
    case "reportcards": return wireReportCards(session);
    case "promotion": return wirePromotion(session);
    case "fees": return wireFees(session);
    case "addclass": return wireAddClass(session);
    case "addteacher": return wireAddStaff(session, "Teacher");
    case "addbursar": return wireAddStaff(session, "Bursar");
    case "schooldetails": return wireSchoolDetails(session);
    case "assessment": return wireAssessment(session);
  }
}

// ---------------- Overview ----------------

function renderOverview(session) {
  const welcome = `
    <div class="card">
      <h2>Welcome, ${session.name || session.username}</h2>
      <p class="card-desc">
        You're signed in as <strong>${session.role}</strong>
        ${session.school !== "ALL" ? `for <strong>${session.school}</strong>` : "with access to all schools"}.
      </p>
    </div>`;

  const extras = (typeof EXTRA_PANELS_BY_ROLE !== "undefined" && EXTRA_PANELS_BY_ROLE[session.role]) || [];
  if (extras.length === 0) return welcome;

  const tiles = extras.map(item => `
    <button class="icon-tile" onclick="window.goToPanel('${item.id}')">
      <span class="icon-tile-glyph">${item.icon}</span>
      <span class="icon-tile-label">${item.label}</span>
    </button>`).join("");

  return welcome + `
    <div class="card">
      <h2>Quick actions</h2>
      <p class="card-desc">Set up your school — classes, staff logins, details, and grading.</p>
      <div class="icon-grid">${tiles}</div>
    </div>`;
}

// ---------------- Add Class ----------------

function renderAddClass() {
  return `
    <div class="card">
      <h2>Add a class</h2>
      <p class="card-desc">e.g. JSS1, JSS2, SS1 — used everywhere a class is selected.</p>
      <div class="form-row">
        <div class="field"><label for="newClassName">Class name</label><input type="text" id="newClassName" placeholder="JSS1"></div>
      </div>
      <button class="btn" id="addClassBtn">Add class</button>
      <div class="status-msg" id="addClassStatus"></div>
      <div id="classList" style="margin-top:16px;"></div>
    </div>`;
}

function wireAddClass(session) {
  const btn = document.getElementById("addClassBtn");
  if (!btn) return;

  async function refreshList() {
    const listEl = document.getElementById("classList");
    try {
      const res = await apiCallAsUser("getClasses", {});
      listEl.innerHTML = res.status === "ok" && res.classes.length
        ? `<p class="card-desc" style="margin:0;"><strong>Current classes:</strong> ${res.classes.join(", ")}</p>`
        : `<div class="empty-state">No classes added yet.</div>`;
    } catch (e) { /* silent — list is a convenience, not critical */ }
  }

  btn.onclick = async () => {
    const className = document.getElementById("newClassName").value.trim();
    const statusEl = document.getElementById("addClassStatus");
    if (!className) return;
    btn.disabled = true;
    try {
      const res = await apiCallAsUser("addClass", { className });
      if (res.status === "ok") {
        showStatus(statusEl, `"${className}" added.`, true);
        document.getElementById("newClassName").value = "";
        refreshList();
      } else {
        showStatus(statusEl, res.message || "Could not add class.", false);
      }
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };

  refreshList();
}

// ---------------- Add Teacher / Add Bursar ----------------
// Same form shape for both — role is fixed by which icon was tapped,
// and creating the account here also creates their Users login row.

function renderAddStaff(role) {
  return `
    <div class="card">
      <h2>Add ${role}</h2>
      <p class="card-desc">Creates their login — they can sign in with this username and password right away.</p>
      <div class="form-row">
        <div class="field"><label for="staffName-${role}">Full name</label><input type="text" id="staffName-${role}" placeholder="e.g. John Okafor"></div>
        <div class="field"><label for="staffUsername-${role}">Username</label><input type="text" id="staffUsername-${role}" placeholder="e.g. john.teacher"></div>
        <div class="field"><label for="staffPassword-${role}">Password</label><input type="text" id="staffPassword-${role}" placeholder="Temporary password"></div>
      </div>
      <button class="btn btn-gold" id="addStaffBtn-${role}">Add ${role}</button>
      <div class="status-msg" id="addStaffStatus-${role}"></div>
    </div>`;
}

function wireAddStaff(session, role) {
  const btn = document.getElementById(`addStaffBtn-${role}`);
  if (!btn) return;
  btn.onclick = async () => {
    const name = document.getElementById(`staffName-${role}`).value.trim();
    const newUsername = document.getElementById(`staffUsername-${role}`).value.trim();
    const newPassword = document.getElementById(`staffPassword-${role}`).value;
    const statusEl = document.getElementById(`addStaffStatus-${role}`);
    if (!name || !newUsername || !newPassword) {
      showStatus(statusEl, "Fill in name, username, and password.", false);
      return;
    }
    btn.disabled = true;
    try {
      const res = await apiCallAsUser("createStaffLogin", { name, newUsername, newPassword, role });
      if (res.status === "ok") {
        showStatus(statusEl, `${role} account created for ${name}.`, true);
        document.getElementById(`staffName-${role}`).value = "";
        document.getElementById(`staffUsername-${role}`).value = "";
        document.getElementById(`staffPassword-${role}`).value = "";
      } else {
        showStatus(statusEl, res.message || `Could not create ${role} account.`, false);
      }
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- School Details ----------------

function renderSchoolDetails() {
  return `
    <div class="card">
      <h2>School details</h2>
      <div class="form-row">
        <div class="field"><label for="sdAddress">Address</label><input type="text" id="sdAddress"></div>
        <div class="field"><label for="sdPhone">Phone</label><input type="text" id="sdPhone"></div>
        <div class="field"><label for="sdEmail">Email</label><input type="text" id="sdEmail"></div>
        <div class="field"><label for="sdMotto">Motto</label><input type="text" id="sdMotto"></div>
      </div>
      <button class="btn" id="saveSchoolDetailsBtn">Save</button>
      <div class="status-msg" id="schoolDetailsStatus"></div>
    </div>`;
}

function wireSchoolDetails(session) {
  const btn = document.getElementById("saveSchoolDetailsBtn");
  if (!btn) return;

  apiCallAsUser("getSchoolDetails", {}).then(res => {
    if (res.status === "ok") {
      document.getElementById("sdAddress").value = res.address || "";
      document.getElementById("sdPhone").value = res.phone || "";
      document.getElementById("sdEmail").value = res.email || "";
      document.getElementById("sdMotto").value = res.motto || "";
    }
  }).catch(() => {});

  btn.onclick = async () => {
    const statusEl = document.getElementById("schoolDetailsStatus");
    const details = {
      address: document.getElementById("sdAddress").value.trim(),
      phone: document.getElementById("sdPhone").value.trim(),
      email: document.getElementById("sdEmail").value.trim(),
      motto: document.getElementById("sdMotto").value.trim()
    };
    btn.disabled = true;
    try {
      const res = await apiCallAsUser("saveSchoolDetails", { details });
      showStatus(statusEl, res.status === "ok" ? "Saved." : (res.message || "Could not save."), res.status === "ok");
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Assessment Settings ----------------

function renderAssessment() {
  return `
    <div class="card">
      <h2>Assessment settings</h2>
      <p class="card-desc">Set the maximum obtainable mark for each component. Applies across all scores for this school.</p>
      <div class="form-row">
        <div class="field"><label for="maxTest1">Test 1 max</label><input type="number" id="maxTest1" min="0"></div>
        <div class="field"><label for="maxTest2">Test 2 max</label><input type="number" id="maxTest2" min="0"></div>
        <div class="field"><label for="maxExam">Exam max</label><input type="number" id="maxExam" min="0"></div>
      </div>
      <button class="btn" id="saveAssessmentBtn">Save</button>
      <div class="status-msg" id="assessmentStatus"></div>
    </div>`;
}

function wireAssessment(session) {
  const btn = document.getElementById("saveAssessmentBtn");
  if (!btn) return;

  apiCallAsUser("getAssessmentSettings", {}).then(res => {
    if (res.status === "ok") {
      document.getElementById("maxTest1").value = res.maxTest1;
      document.getElementById("maxTest2").value = res.maxTest2;
      document.getElementById("maxExam").value = res.maxExam;
    }
  }).catch(() => {});

  btn.onclick = async () => {
    const statusEl = document.getElementById("assessmentStatus");
    const maxTest1 = Number(document.getElementById("maxTest1").value || 0);
    const maxTest2 = Number(document.getElementById("maxTest2").value || 0);
    const maxExam = Number(document.getElementById("maxExam").value || 0);
    btn.disabled = true;
    try {
      const res = await apiCallAsUser("saveAssessmentSettings", { maxTest1, maxTest2, maxExam });
      showStatus(statusEl, res.status === "ok" ? "Saved." : (res.message || "Could not save."), res.status === "ok");
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Schools (SuperAdmin only) ----------------

function renderSchools() {
  return `
    <div class="card">
      <h2>Add a school</h2>
      <p class="card-desc">Creates a new school record with its own student roster, scores, and fees.</p>
      <div class="form-row">
        <div class="field">
          <label for="schoolName">School name</label>
          <input type="text" id="schoolName" placeholder="e.g. Unity College">
        </div>
      </div>
      <button class="btn btn-gold" id="addSchoolBtn">Add school</button>
      <div class="status-msg" id="schoolStatus"></div>
    </div>`;
}

function wireSchools(session) {
  const btn = document.getElementById("addSchoolBtn");
  if (!btn) return;
  btn.onclick = async () => {
    const name = document.getElementById("schoolName").value.trim();
    const statusEl = document.getElementById("schoolStatus");
    if (!name) return;
    btn.disabled = true;
    try {
      const res = await apiCallAsUser("addSchool", { schoolName: name });
      if (res.status === "ok") {
        showStatus(statusEl, `"${name}" was added.`, true);
        document.getElementById("schoolName").value = "";
      } else {
        showStatus(statusEl, res.message || "Could not add school.", false);
      }
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Students (SuperAdmin, SchoolAdmin) ----------------

function renderStudents() {
  return `
    <div class="card">
      <h2>Add students</h2>
      <p class="card-desc">Add one student, or paste several lines as "RollNo, Name" to add them together.</p>
      <div class="form-row">
        <div class="field">
          <label for="studentClass">Class</label>
          <input type="text" id="studentClass" placeholder="e.g. JSS1">
        </div>
      </div>
      <div class="field" style="margin-bottom:14px;">
        <label for="studentBulk">Students (one per line: RollNo, Name)</label>
        <textarea id="studentBulk" rows="6" placeholder="GH001, Chinedu Obi
GH002, Blessing Eze"></textarea>
      </div>
      <button class="btn" id="addStudentsBtn">Add students</button>
      <div class="status-msg" id="studentStatus"></div>
    </div>`;
}

function wireStudents(session) {
  const btn = document.getElementById("addStudentsBtn");
  if (!btn) return;
  btn.onclick = async () => {
    const className = document.getElementById("studentClass").value.trim();
    const raw = document.getElementById("studentBulk").value.trim();
    const statusEl = document.getElementById("studentStatus");
    if (!className || !raw) return;

    const students = raw.split("\n").filter(Boolean).map(line => {
      const [rollno, ...rest] = line.split(",");
      return { rollno: (rollno || "").trim(), name: rest.join(",").trim() };
    }).filter(s => s.rollno && s.name);

    if (students.length === 0) {
      showStatus(statusEl, "Add at least one valid line.", false);
      return;
    }

    btn.disabled = true;
    try {
      const res = await apiCallAsUser("bulkAddStudents", { class: className, students });
      if (res.status === "ok") {
        showStatus(statusEl, `${res.added} student(s) added to ${className}.`, true);
        document.getElementById("studentBulk").value = "";
      } else {
        showStatus(statusEl, res.message || "Could not add students.", false);
      }
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Scores (SuperAdmin, SchoolAdmin, Teacher) ----------------

function renderScores(session) {
  return `
    <div class="card">
      <h2>Submit a score</h2>
      <p class="card-desc">Enter test and exam marks for one student, subject, and term.</p>
      <div class="form-row">
        <div class="field"><label for="scRoll">Roll number</label><input type="text" id="scRoll" placeholder="GH001"></div>
        <div class="field"><label for="scSession">Session</label><input type="text" id="scSession" placeholder="2025/2026"></div>
        <div class="field">
          <label for="scTerm">Term</label>
          <select id="scTerm"><option>Term1</option><option>Term2</option><option>Term3</option></select>
        </div>
        <div class="field"><label for="scSubject">Subject</label><input type="text" id="scSubject" placeholder="Mathematics"></div>
      </div>
      <div class="form-row">
        <div class="field"><label for="scTest1">Test 1</label><input type="number" id="scTest1" min="0"></div>
        <div class="field"><label for="scTest2">Test 2</label><input type="number" id="scTest2" min="0"></div>
        <div class="field"><label for="scExam">Exam</label><input type="number" id="scExam" min="0"></div>
      </div>
      <button class="btn" id="submitScoreBtn">Save score</button>
      <div class="status-msg" id="scoreStatus"></div>
    </div>

    <div class="card">
      <h2>View a student's record</h2>
      <p class="card-desc">Look up every score entered for one student, across all sessions.</p>
      <div class="form-row">
        <div class="field"><label for="histRoll">Roll number</label><input type="text" id="histRoll" placeholder="GH001"></div>
      </div>
      <button class="btn" id="viewHistoryBtn">View record</button>
      <div id="historyResult" style="margin-top:14px;"></div>
    </div>`;
}

function wireScores(session) {
  const submitBtn = document.getElementById("submitScoreBtn");
  if (submitBtn) {
    submitBtn.onclick = async () => {
      const statusEl = document.getElementById("scoreStatus");
      const payload = {
        rollno: document.getElementById("scRoll").value.trim(),
        session: document.getElementById("scSession").value.trim(),
        term: document.getElementById("scTerm").value,
        subject: document.getElementById("scSubject").value.trim(),
        test1: Number(document.getElementById("scTest1").value || 0),
        test2: Number(document.getElementById("scTest2").value || 0),
        exam: Number(document.getElementById("scExam").value || 0)
      };
      if (!payload.rollno || !payload.session || !payload.subject) {
        showStatus(statusEl, "Fill in roll number, session, and subject.", false);
        return;
      }
      submitBtn.disabled = true;
      try {
        const res = await apiCallAsUser("submitScore", payload);
        if (res.status === "ok") {
          showStatus(statusEl, `Score ${res.action === "updated" ? "updated" : "saved"}.`, true);
        } else {
          showStatus(statusEl, res.message || "Could not save score.", false);
        }
      } catch (e) {
        showStatus(statusEl, "Could not reach the server.", false);
      } finally {
        submitBtn.disabled = false;
      }
    };
  }

  const historyBtn = document.getElementById("viewHistoryBtn");
  if (historyBtn) {
    historyBtn.onclick = async () => {
      const rollno = document.getElementById("histRoll").value.trim();
      const resultEl = document.getElementById("historyResult");
      if (!rollno) return;
      historyBtn.disabled = true;
      resultEl.innerHTML = "";
      try {
        const res = await apiCallAsUser("getStudentHistory", { rollno });
        if (res.status === "ok" && res.records.length) {
          resultEl.innerHTML = `<table>
            <thead><tr><th>Session</th><th>Term</th><th>Subject</th><th>Test1</th><th>Test2</th><th>Exam</th><th>Total</th></tr></thead>
            <tbody>${res.records.map(r => `<tr>
              <td>${r.session}</td><td>${r.term}</td><td>${r.subject}</td>
              <td>${r.test1}</td><td>${r.test2}</td><td>${r.exam}</td><td>${r.total}</td>
            </tr>`).join("")}</tbody></table>`;
        } else {
          resultEl.innerHTML = `<div class="empty-state">No records found for this roll number.</div>`;
        }
      } catch (e) {
        resultEl.innerHTML = `<div class="empty-state">Could not reach the server.</div>`;
      } finally {
        historyBtn.disabled = false;
      }
    };
  }
}

// ---------------- Report Cards (SuperAdmin, SchoolAdmin) ----------------

function renderReportCards() {
  return `
    <div class="card">
      <h2>Generate a report card</h2>
      <p class="card-desc">Shows subject totals, overall average, and class position.</p>
      <div class="form-row">
        <div class="field"><label for="rcRoll">Roll number</label><input type="text" id="rcRoll" placeholder="GH001"></div>
        <div class="field"><label for="rcSession">Session</label><input type="text" id="rcSession" placeholder="2025/2026"></div>
        <div class="field">
          <label for="rcTerm">Term</label>
          <select id="rcTerm"><option>Term1</option><option>Term2</option><option>Term3</option></select>
        </div>
      </div>
      <button class="btn" id="genReportBtn">Generate</button>
      <div id="reportResult" style="margin-top:16px;"></div>
    </div>`;
}

function wireReportCards(session) {
  const btn = document.getElementById("genReportBtn");
  if (!btn) return;
  btn.onclick = async () => {
    const rollno = document.getElementById("rcRoll").value.trim();
    const reportSession = document.getElementById("rcSession").value.trim();
    const term = document.getElementById("rcTerm").value;
    const resultEl = document.getElementById("reportResult");
    if (!rollno || !reportSession) return;

    btn.disabled = true;
    resultEl.innerHTML = "";
    try {
      const res = await apiCallAsUser("generateReportCard", { rollno, session: reportSession, term });
      if (res.status === "ok") {
        resultEl.innerHTML = `
          <table style="margin-bottom:14px;">
            <thead><tr><th>Subject</th><th>Test1</th><th>Test2</th><th>Exam</th><th>Total</th></tr></thead>
            <tbody>${res.subjects.map(s => `<tr>
              <td>${s.subject}</td><td>${s.test1}</td><td>${s.test2}</td><td>${s.exam}</td><td>${s.total}</td>
            </tr>`).join("")}</tbody>
          </table>
          <p><strong>Overall total:</strong> ${res.overallTotal} &nbsp;·&nbsp;
             <strong>Average:</strong> ${res.overallAverage.toFixed(1)} &nbsp;·&nbsp;
             <strong>Position:</strong> ${res.classPosition} of ${res.classSize} (${res.class})</p>`;
      } else {
        resultEl.innerHTML = `<div class="empty-state">${res.message || "No record found."}</div>`;
      }
    } catch (e) {
      resultEl.innerHTML = `<div class="empty-state">Could not reach the server.</div>`;
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Promotion (SuperAdmin, SchoolAdmin) ----------------

function renderPromotion() {
  return `
    <div class="card">
      <h2>Promote a class</h2>
      <p class="card-desc">Students whose session average meets the threshold move up a class; others stay.</p>
      <div class="form-row">
        <div class="field"><label for="prClass">Class</label><input type="text" id="prClass" placeholder="JSS1"></div>
        <div class="field"><label for="prSession">Session ending</label><input type="text" id="prSession" placeholder="2025/2026"></div>
        <div class="field"><label for="prThreshold">Pass average</label><input type="number" id="prThreshold" value="40"></div>
      </div>
      <button class="btn btn-gold" id="promoteBtn">Run promotion</button>
      <div class="status-msg" id="promoteStatus"></div>
      <div id="promoteResult" style="margin-top:14px;"></div>
    </div>`;
}

function wirePromotion(session) {
  const btn = document.getElementById("promoteBtn");
  if (!btn) return;
  btn.onclick = async () => {
    const className = document.getElementById("prClass").value.trim();
    const prSession = document.getElementById("prSession").value.trim();
    const threshold = Number(document.getElementById("prThreshold").value || 40);
    const statusEl = document.getElementById("promoteStatus");
    const resultEl = document.getElementById("promoteResult");
    if (!className || !prSession) return;

    btn.disabled = true;
    try {
      const res = await apiCallAsUser("promoteStudents", { class: className, session: prSession, threshold });
      if (res.status === "ok") {
        showStatus(statusEl, `${res.promoted} of ${res.processed} student(s) promoted.`, true);
        resultEl.innerHTML = `<table>
          <thead><tr><th>Roll No</th><th>Average</th><th>Result</th></tr></thead>
          <tbody>${res.details.map(d => `<tr>
            <td>${d.rollno}</td>
            <td>${d.average !== null ? d.average.toFixed(1) : "—"}</td>
            <td>${d.promoted ? "Promoted to " + d.newClass : (d.reason || "Stayed in " + (d.newClass || className))}</td>
          </tr>`).join("")}</tbody></table>`;
      } else {
        showStatus(statusEl, res.message || "Could not run promotion.", false);
      }
    } catch (e) {
      showStatus(statusEl, "Could not reach the server.", false);
    } finally {
      btn.disabled = false;
    }
  };
}

// ---------------- Fees (SuperAdmin, SchoolAdmin, Bursar) ----------------

function renderFees(session) {
  return `
    <div class="card">
      <h2>Record a payment</h2>
      <div class="form-row">
        <div class="field"><label for="feeRoll">Roll number</label><input type="text" id="feeRoll" placeholder="GH001"></div>
        <div class="field"><label for="feeSession">Session</label><input type="text" id="feeSession" placeholder="2025/2026"></div>
        <div class="field">
          <label for="feeTerm">Term</label>
          <select id="feeTerm"><option>Term1</option><option>Term2</option><option>Term3</option></select>
        </div>
        <div class="field"><label for="feeAmount">Amount</label><input type="number" id="feeAmount" min="0"></div>
      </div>
      <button class="btn btn-gold" id="recordPaymentBtn">Record payment</button>
      <div class="status-msg" id="feeStatus"></div>
    </div>

    <div class="card">
      <h2>Transaction history</h2>
      <p class="card-desc">Leave roll number blank to see every payment for this school.</p>
      <div class="form-row">
        <div class="field"><label for="txRoll">Roll number (optional)</label><input type="text" id="txRoll" placeholder="GH001"></div>
      </div>
      <button class="btn" id="viewTxBtn">View history</button>
      <div id="txResult" style="margin-top:14px;"></div>
    </div>`;
}

function wireFees(session) {
  const payBtn = document.getElementById("recordPaymentBtn");
  if (payBtn) {
    payBtn.onclick = async () => {
      const statusEl = document.getElementById("feeStatus");
      const payload = {
        rollno: document.getElementById("feeRoll").value.trim(),
        session: document.getElementById("feeSession").value.trim(),
        term: document.getElementById("feeTerm").value,
        amount: Number(document.getElementById("feeAmount").value || 0)
      };
      if (!payload.rollno || !payload.session || !payload.amount) {
        showStatus(statusEl, "Fill in roll number, session, and amount.", false);
        return;
      }
      payBtn.disabled = true;
      try {
        const res = await apiCallAsUser("recordPayment", payload);
        if (res.status === "ok") {
          showStatus(statusEl, `Payment recorded — receipt ${res.receiptNo}.`, true);
        } else {
          showStatus(statusEl, res.message || "Could not record payment.", false);
        }
      } catch (e) {
        showStatus(statusEl, "Could not reach the server.", false);
      } finally {
        payBtn.disabled = false;
      }
    };
  }

  const txBtn = document.getElementById("viewTxBtn");
  if (txBtn) {
    txBtn.onclick = async () => {
      const rollno = document.getElementById("txRoll").value.trim();
      const resultEl = document.getElementById("txResult");
      txBtn.disabled = true;
      resultEl.innerHTML = "";
      try {
        const res = await apiCallAsUser("getTransactionHistory", { rollno: rollno || undefined });
        if (res.status === "ok" && res.transactions.length) {
          resultEl.innerHTML = `<table>
            <thead><tr><th>Receipt</th><th>Roll No</th><th>Name</th><th>Session</th><th>Term</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>${res.transactions.map(t => `<tr>
              <td>${t.receiptNo}</td><td>${t.rollno}</td><td>${t.name}</td>
              <td>${t.session}</td><td>${t.term}</td><td>${t.amountPaid}</td><td>${t.date}</td>
            </tr>`).join("")}</tbody></table>`;
        } else {
          resultEl.innerHTML = `<div class="empty-state">No transactions found.</div>`;
        }
      } catch (e) {
        resultEl.innerHTML = `<div class="empty-state">Could not reach the server.</div>`;
      } finally {
        txBtn.disabled = false;
      }
    };
  }
}
