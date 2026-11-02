"use strict";

/* ==========================================
   SMARTPLAN - ASSIGNMENT PLANNER
   Plain JavaScript + LocalStorage
========================================== */

const STORAGE_KEY = "smartplan_assignments_v1";

const $ = (selector) => document.querySelector(selector);

const elements = {
    pageTitle: $("#page-title"),
    addButton: $("#add-assignment-btn"),
    modal: $("#assignment-modal"),
    modalTitle: $("#modal-title"),
    form: $("#assignment-form"),
    title: $("#assignment-title"),
    subject: $("#assignment-subject"),
    dueDate: $("#assignment-due-date"),
    priority: $("#assignment-priority"),
    description: $("#assignment-description"),
    saveButton: $("#save-assignment-btn"),
    search: $("#search-assignments"),
    filter: $("#status-filter"),
    upcoming: $("#upcoming-assignments"),
    allAssignments: $("#all-assignments"),
    planner: $("#planner-content"),
    toast: $("#toast")
};

let assignments = loadAssignments();
let editingId = null;
let toastTimer = null;

/* ---------- STORAGE ---------- */

function loadAssignments() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Could not load assignments:", error);
        return [];
    }
}

function saveAssignments() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
        return true;
    } catch (error) {
        console.error("Could not save assignments:", error);
        showToast("Could not save data. Check browser storage.");
        return false;
    }
}

/* ---------- HELPERS ---------- */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return replacements[character];
    });
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) {
        return "No deadline";
    }

    const parts = dateString.split("-").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return "Invalid date";
    }

    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getStatus(assignment) {
    if (assignment.completed) {
        return "completed";
    }

    if (assignment.dueDate < localDateString()) {
        return "overdue";
    }

    return "pending";
}

function getPriority(assignment) {
    const priority = String(assignment.priority || "medium").toLowerCase();

    return ["low", "medium", "high"].includes(priority)
        ? priority
        : "medium";
}

function sortByDeadline(items) {
    return [...items].sort((a, b) => {
        return (a.dueDate || "9999-12-31")
            .localeCompare(b.dueDate || "9999-12-31");
    });
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 2800);
}

/* ---------- NAVIGATION ---------- */

const pageNames = {
    dashboard: "Dashboard",
    assignments: "Assignments",
    planner: "Smart Calendar",
    analytics: "Study Analytics",
    focus: "Focus Mode",
    notes: "Notes & Resources",
    achievements: "Streaks & Achievements",
    assistant: "AI Study Assistant",
    profile: "User Profile"
};

function showPage(pageId) {
    if (!pageNames[pageId]) {
        return;
    }

    document.querySelectorAll(".page-view").forEach((page) => {
        page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll("[data-view]").forEach((button) => {
        if (button.classList.contains("nav-link")) {
            button.classList.toggle(
                "active",
                button.dataset.view === pageId
            );
        }
    });

    elements.pageTitle.textContent = pageNames[pageId];

    if (pageId === "assignments") {
        renderAssignments();
    } else if (pageId === "planner") {
        renderPlanner();
    } else if (pageId === "analytics") {
        renderAnalytics();
    } else if (pageId === "dashboard") {
        renderDashboard();
    }
    if (["analytics", "focus", "notes", "achievements", "assistant", "profile"].includes(pageId)) {
        window.dispatchEvent(new CustomEvent("smartplan:page", { detail: { pageId } }));
    }
}

/* ---------- MODAL ---------- */

function openModal(assignment = null) {
    editingId = assignment ? assignment.id : null;

    elements.form.reset();

    elements.modalTitle.textContent = assignment
        ? "Edit Assignment"
        : "Add Assignment";

    elements.saveButton.textContent = assignment
        ? "Update Assignment"
        : "Save Assignment";

    elements.dueDate.min = localDateString();

    if (assignment) {
        elements.title.value = assignment.title || "";
        elements.subject.value = assignment.subject || "";
        elements.dueDate.value = assignment.dueDate || "";
        elements.priority.value = getPriority(assignment);
        elements.description.value = assignment.description || "";

        // Allow editing an existing task with a past deadline.
        elements.dueDate.min = "";
    } else {
        elements.dueDate.value = localDateString();
        elements.priority.value = "medium";
    }

    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";

    setTimeout(() => elements.title.focus(), 0);
}

function closeModal() {
    elements.modal.hidden = true;
    document.body.style.overflow = "";
    editingId = null;
    elements.form.reset();
}

/* ---------- ASSIGNMENT ITEM ---------- */

function assignmentItem(assignment) {
    const status = getStatus(assignment);
    const priority = getPriority(assignment);

    const statusLabels = {
        pending: "Pending",
        completed: "Completed",
        overdue: "Overdue"
    };

    return `
        <article class="assignment-item ${assignment.completed ? "is-completed" : ""}">
            <div class="assignment-info">
                <h3>${escapeHTML(assignment.title)}</h3>

                <div class="assignment-meta">
                    <span>${escapeHTML(assignment.subject || "General")}</span>
                    <span>Deadline: ${formatDate(assignment.dueDate)}</span>
                </div>

                ${
                    assignment.description
                        ? `<p class="assignment-description">${escapeHTML(assignment.description)}</p>`
                        : ""
                }

                <div class="assignment-badges">
                    <span class="badge ${status}">
                        ${statusLabels[status]}
                    </span>

                    <span class="badge ${priority}">
                        ${priority.charAt(0).toUpperCase() + priority.slice(1)} priority
                    </span>
                </div>
            </div>

            <div class="assignment-actions">
                <button
                    type="button"
                    class="secondary-button"
                    data-action="toggle"
                    data-id="${escapeHTML(assignment.id)}"
                >${assignment.completed ? "Undo" : "Complete"}</button>

                <button
                    type="button"
                    class="secondary-button"
                    data-action="edit"
                    data-id="${escapeHTML(assignment.id)}"
                >Edit</button>

                <button
                    type="button"
                    class="danger-button"
                    data-action="delete"
                    data-id="${escapeHTML(assignment.id)}"
                >Delete</button>
            </div>
        </article>
    `;
}

/* ---------- EMPTY STATE ---------- */

function emptyState(message) {
    return `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>No assignments found</h3>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

/* ---------- DASHBOARD ---------- */

function renderDashboard() {
    const total = assignments.length;
    const completed = assignments.filter(
        (item) => getStatus(item) === "completed"
    ).length;

    const pending = assignments.filter(
        (item) => getStatus(item) === "pending"
    ).length;

    const overdue = assignments.filter(
        (item) => getStatus(item) === "overdue"
    ).length;

    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

    $("#total-assignments").textContent = total;
    $("#pending-assignments").textContent = pending;
    $("#completed-assignments").textContent = completed;
    $("#overdue-assignments").textContent = overdue;

    $("#progress-percentage").textContent = `${percentage}%`;
    $("#progress-fill").style.width = `${percentage}%`;

    $("#progress-circle").style.background =
        `conic-gradient(var(--primary) ${percentage}%, #eeedfa ${percentage}%)`;

    $("#progress-message").textContent = total
        ? `${completed} of ${total} assignments completed. Keep it up!`
        : "Add an assignment to get started!";

    const upcoming = sortByDeadline(
        assignments.filter((item) => !item.completed)
    ).slice(0, 4);

    elements.upcoming.innerHTML = upcoming.length
        ? upcoming.map(assignmentItem).join("")
        : emptyState("Your upcoming assignments will appear here.");

    renderAnalytics();
}

/* ---------- ASSIGNMENTS PAGE ---------- */

function renderAssignments() {
    const query = elements.search.value.trim().toLowerCase();
    const selectedStatus = elements.filter.value;

    const filtered = sortByDeadline(assignments).filter((item) => {
        const matchesSearch = [
            item.title,
            item.subject,
            item.description
        ].some((value) => String(value || "").toLowerCase().includes(query));

        const matchesStatus =
            selectedStatus === "all" ||
            getStatus(item) === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    elements.allAssignments.innerHTML = filtered.length
        ? filtered.map(assignmentItem).join("")
        : emptyState(
            assignments.length
                ? "Try another search or change the status filter."
                : "Click Add Assignment to create your first task."
        );
}

/* ---------- STUDY PLANNER ---------- */

let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let calendarSelectedDate = localDateString();

function renderPlanner() {
    const grid = $("#calendar-grid");
    if (!grid) return;

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = localDateString();

    $("#calendar-month-label").textContent = calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) {
        cells.push('<div class="calendar-cell calendar-empty" aria-hidden="true"></div>');
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayItems = assignments.filter(item => item.dueDate === date);
        const isToday = date === today;
        const isSelected = date === calendarSelectedDate;
        const dots = dayItems.slice(0, 4).map(item => `<i class="calendar-task-dot ${item.completed ? "completed" : ""}" title="${escapeHTML(item.title)}"></i>`).join("");
        cells.push(`<button type="button" class="calendar-cell ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${dayItems.length ? "has-tasks" : ""}" data-calendar-date="${date}" aria-label="${date}, ${dayItems.length} assignments"><span class="calendar-date-number">${day}</span><span class="calendar-dots">${dots}</span>${dayItems.length > 4 ? `<small>+${dayItems.length - 4}</small>` : ""}</button>`);
    }
    const totalCells = firstWeekday + daysInMonth;
    const trailing = (7 - totalCells % 7) % 7;
    for (let i = 0; i < trailing; i++) cells.push('<div class="calendar-cell calendar-empty" aria-hidden="true"></div>');
    grid.innerHTML = cells.join("");
    renderCalendarDay();
}

function renderCalendarDay() {
    const items = sortByDeadline(assignments.filter(item => item.dueDate === calendarSelectedDate));
    const selected = new Date(`${calendarSelectedDate}T00:00:00`);
    $("#calendar-selected-label").textContent = selected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("#calendar-day-count").textContent = `${items.length} task${items.length === 1 ? "" : "s"}`;
    $("#calendar-day-assignments").innerHTML = items.length
        ? items.map(assignmentItem).join("")
        : emptyState("No assignments due on this date. Enjoy the free time!");
}

$("#calendar-prev")?.addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderPlanner();
});
$("#calendar-next")?.addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderPlanner();
});
$("#calendar-today")?.addEventListener("click", () => {
    calendarMonth = new Date();
    calendarMonth.setDate(1);
    calendarSelectedDate = localDateString();
    renderPlanner();
});
$("#calendar-add-btn")?.addEventListener("click", () => openModal());
$("#calendar-grid")?.addEventListener("click", event => {
    const cell = event.target.closest("[data-calendar-date]");
    if (!cell) return;
    calendarSelectedDate = cell.dataset.calendarDate;
    renderPlanner();
});

/* ---------- ANALYTICS ---------- */

function renderAnalytics() {
    const total = assignments.length;

    const completed = assignments.filter(
        (item) => getStatus(item) === "completed"
    ).length;

    const pending = assignments.filter(
        (item) => getStatus(item) === "pending"
    ).length;

    const overdue = assignments.filter(
        (item) => getStatus(item) === "overdue"
    ).length;

    const percentage = total
        ? Math.round((completed / total) * 100)
        : 0;

    $("#analytics-total").textContent = total;
    $("#analytics-completed").textContent = completed;
    $("#analytics-pending").textContent = pending;
    $("#analytics-overdue").textContent = overdue;

    $("#analytics-progress-fill").style.width = `${percentage}%`;
    $("#analytics-progress-text").textContent = `${percentage}% completed`;

    $("#analytics-summary").textContent = total
        ? `You've completed ${completed} of ${total} assignments. You have ${pending} pending and ${overdue} overdue.`
        : "You haven't added any assignments yet.";
}

/* ---------- SAVE ASSIGNMENT ---------- */

elements.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = elements.title.value.trim();
    const subject = elements.subject.value.trim();
    const dueDate = elements.dueDate.value;
    const priority = elements.priority.value;
    const description = elements.description.value.trim();

    if (!title || !dueDate) {
        showToast("Please enter a title and due date.");
        return;
    }

    if (!editingId && dueDate < localDateString()) {
        showToast("Please choose today or a future date.");
        return;
    }

    if (!["low", "medium", "high"].includes(priority)) {
        showToast("Please select a valid priority.");
        return;
    }

    if (editingId) {
        assignments = assignments.map((item) => {
            if (item.id !== editingId) {
                return item;
            }

            return {
                ...item,
                title,
                subject,
                dueDate,
                priority,
                description
            };
        });
    } else {
        assignments.push({
            id: (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title,
            subject,
            dueDate,
            priority,
            description,
            completed: false,
            createdAt: new Date().toISOString()
        });
    }

    if (!saveAssignments()) {
        return;
    }

    closeModal();
    renderAll();
    showToast(editingId ? "Assignment updated!" : "Assignment added!");
});

/* ---------- BUTTON ACTIONS ---------- */

document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");

    if (viewButton) {
        showPage(viewButton.dataset.view);
        return;
    }

    const closeButton = event.target.closest("[data-close-modal]");

    if (closeButton) {
        closeModal();
        return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
        return;
    }

    const { action, id } = actionButton.dataset;
    const assignment = assignments.find((item) => item.id === id);

    if (!assignment) {
        return;
    }

    if (action === "edit") {
        openModal(assignment);
        return;
    }

    if (action === "toggle") {
        assignments = assignments.map((item) =>
            item.id === id
                ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : null }
                : item
        );

        if (saveAssignments()) {
            renderAll();
            showToast(
                assignment.completed
                    ? "Assignment marked as pending."
                    : "Assignment completed!"
            );
        }

        return;
    }

    if (action === "delete") {
        const confirmed = window.confirm(
            `Delete "${assignment.title}"? This cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        assignments = assignments.filter((item) => item.id !== id);

        if (saveAssignments()) {
            renderAll();
            showToast("Assignment deleted.");
        }
    }
});

/* ---------- MODAL EVENTS ---------- */

elements.addButton.addEventListener("click", () => {
    openModal();
});

elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) {
        closeModal();
    }
});

/* ---------- SEARCH AND FILTER ---------- */

elements.search.addEventListener("input", renderAssignments);
elements.filter.addEventListener("change", renderAssignments);

/* ---------- RENDER EVERYTHING ---------- */

function renderAll() {
    renderDashboard();
    renderAssignments();
    renderPlanner();
    renderAnalytics();
}

/* ---------- START APPLICATION ---------- */

renderAll();
showPage("dashboard");

console.log("SmartPlan is running successfully.");
/* ==========================================
   SMARTPLAN - DARK MODE
========================================== */

(function initializeThemeToggle() {
    const THEME_KEY = "smartplan_theme";

    const themeButton = document.querySelector("#theme-toggle");
    const themeIcon = document.querySelector("#theme-icon");
    const themeLabel = document.querySelector("#theme-label");

    if (!themeButton || !themeIcon || !themeLabel) {
        console.warn("SmartPlan theme toggle elements were not found.");
        return;
    }

    function applyTheme(theme) {
        const isDark = theme === "dark";

        document.body.classList.toggle("dark-mode", isDark);

        themeIcon.textContent = isDark ? "☀️" : "🌙";
        themeLabel.textContent = isDark ? "Light Mode" : "Dark Mode";

        themeButton.setAttribute(
            "aria-label",
            isDark ? "Switch to light mode" : "Switch to dark mode"
        );

        try {
            localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
        } catch (error) {
            console.warn("Could not save theme preference:", error);
        }
    }

    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem(THEME_KEY) || "light";
    } catch (error) {
        console.warn("Could not read saved theme preference:", error);
    }

    applyTheme(savedTheme);

    themeButton.addEventListener("click", () => {
        const isDark = document.body.classList.contains("dark-mode");

        applyTheme(isDark ? "light" : "dark");
    });
})();
/* ==========================================
   SMARTPLAN - NOTIFICATION SYSTEM
========================================== */

(function initializeNotifications() {
    const NOTIFICATION_KEY = "smartplan_notifications_v1";
    const SEEN_DEADLINES_KEY = "smartplan_seen_deadlines_v1";
    const ASSIGNMENTS_KEY = "smartplan_assignments_v1";

    const bell = document.querySelector("#notification-bell");
    const badge = document.querySelector("#notification-count");
    const panel = document.querySelector("#notification-panel");
    const list = document.querySelector("#notification-list");
    const summary = document.querySelector("#notification-summary");
    const clearButton = document.querySelector("#notification-clear");
    const assignmentForm = document.querySelector("#assignment-form");

    if (!bell || !badge || !panel || !list || !summary || !clearButton) {
        console.warn("SmartPlan notification elements were not found.");
        return;
    }

    function readStorage(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.warn("Could not read notification data:", error);
            return fallback;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("Could not save notification data:", error);
            return false;
        }
    }

    function getAssignments() {
        const assignments = readStorage(ASSIGNMENTS_KEY, []);
        return Array.isArray(assignments) ? assignments : [];
    }

    function getNotifications() {
        const notifications = readStorage(NOTIFICATION_KEY, []);
        return Array.isArray(notifications) ? notifications : [];
    }

    function getSeenDeadlines() {
        const seen = readStorage(SEEN_DEADLINES_KEY, []);
        return Array.isArray(seen) ? seen : [];
    }

    function addNotification(title, message, uniqueKey) {
        const notifications = getNotifications();

        // Prevent duplicate notifications.
        if (
            uniqueKey &&
            notifications.some(item => item.uniqueKey === uniqueKey)
        ) {
            return;
        }

        notifications.unshift({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            title,
            message,
            createdAt: new Date().toISOString(),
            read: false,
            uniqueKey: uniqueKey || null
        });

        // Keep the latest 100 notifications.
        writeStorage(NOTIFICATION_KEY, notifications.slice(0, 100));
        renderNotifications();
    }

    function renderNotifications() {
        const notifications = getNotifications();
        const unreadCount = notifications.filter(item => !item.read).length;

        badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
        badge.hidden = unreadCount === 0;

        summary.textContent = unreadCount
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
            : "You're all caught up!";

        list.replaceChildren();

        if (notifications.length === 0) {
            const empty = document.createElement("div");
            empty.className = "notification-empty";
            empty.textContent = "No notifications yet.";
            list.appendChild(empty);
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement("article");
            item.className = `notification-item${notification.read ? "" : " unread"}`;

            const dot = document.createElement("span");
            dot.className = "notification-dot";
            dot.setAttribute("aria-hidden", "true");

            const copy = document.createElement("div");
            copy.className = "notification-copy";

            const title = document.createElement("strong");
            title.textContent = notification.title || "Notification";

            const message = document.createElement("p");
            message.textContent = notification.message || "";

            const time = document.createElement("time");
            const date = new Date(notification.createdAt);

            if (!Number.isNaN(date.getTime())) {
                time.dateTime = date.toISOString();
                time.textContent = date.toLocaleString();
            } else {
                time.textContent = "";
            }

            copy.append(title, message, time);
            item.append(dot, copy);
            list.appendChild(item);
        });
    }

    function markAllAsRead() {
        const notifications = getNotifications().map(item => ({
            ...item,
            read: true
        }));

        writeStorage(NOTIFICATION_KEY, notifications);
        renderNotifications();
    }

    function togglePanel(forceOpen) {
        const shouldOpen =
            typeof forceOpen === "boolean"
                ? forceOpen
                : panel.hidden;

        panel.hidden = !shouldOpen;
        bell.setAttribute("aria-expanded", String(shouldOpen));

        if (shouldOpen) {
            markAllAsRead();
        }
    }

    bell.addEventListener("click", event => {
        event.stopPropagation();
        togglePanel();
    });

    panel.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", event => {
        if (!panel.hidden && !event.target.closest(".notification-wrapper")) {
            togglePanel(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !panel.hidden) {
            togglePanel(false);
            bell.focus();
        }
    });

    clearButton.addEventListener("click", () => {
        writeStorage(NOTIFICATION_KEY, []);
        renderNotifications();
    });

    /*
     * Detect newly created assignments.
     * Capture the submit event before the existing form handler runs.
     */
    if (assignmentForm) {
        assignmentForm.addEventListener("submit", () => {
            const previousIds = new Set(
                getAssignments().map(assignment => String(assignment.id))
            );

            setTimeout(() => {
                const currentAssignments = getAssignments();

                const newAssignments = currentAssignments.filter(
                    assignment => !previousIds.has(String(assignment.id))
                );

                newAssignments.forEach(assignment => {
                    addNotification(
                        "Assignment added",
                        `"${assignment.title}" has been added to SmartPlan.`,
                        `assignment-added-${assignment.id}`
                    );
                });
            }, 100);
        }, true);
    }

    /*
     * Detect assignment completion using the existing data-action="toggle"
     * buttons. The existing assignment handler remains unchanged.
     */
    document.addEventListener("click", event => {
        const actionButton = event.target.closest('[data-action="toggle"]');

        if (!actionButton) {
            return;
        }

        const assignmentId =
            actionButton.dataset.id ||
            actionButton.closest("[data-id]")?.dataset.id;

        if (assignmentId === undefined) {
            return;
        }

        const before = getAssignments().find(
            assignment => String(assignment.id) === String(assignmentId)
        );

        if (!before) {
            return;
        }

        const wasCompleted = Boolean(before.completed);

        setTimeout(() => {
            const after = getAssignments().find(
                assignment => String(assignment.id) === String(assignmentId)
            );

            if (!after || Boolean(after.completed) === wasCompleted) {
                return;
            }

            addNotification(
                after.completed ? "Assignment completed" : "Assignment reopened",
                `"${after.title}" ${after.completed ? "has been marked complete." : "is marked incomplete again."}`,
                `assignment-status-${after.id}-${after.completed}-${Date.now()}`
            );
        }, 100);
    });

    /*
     * Check upcoming and overdue assignment deadlines.
     * Each assignment gets one alert for each deadline category.
     */
    function checkDeadlines() {
        const assignments = getAssignments();
        const seen = new Set(getSeenDeadlines());

        // Compare calendar dates in the user's local timezone.
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        assignments.forEach(assignment => {
            if (assignment.completed || !assignment.dueDate) {
                return;
            }

            // Parse YYYY-MM-DD as a local calendar date.
            const parts = String(assignment.dueDate).split("-").map(Number);

            if (
                parts.length !== 3 ||
                parts.some(number => !Number.isFinite(number))
            ) {
                return;
            }

            const dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
            dueDate.setHours(0, 0, 0, 0);

            if (Number.isNaN(dueDate.getTime())) {
                return;
            }

            const daysLeft = Math.round(
                (dueDate.getTime() - today.getTime()) / 86400000
            );

            let category = "";
            let title = "";
            let message = "";

            if (daysLeft < 0) {
                category = "overdue";
                title = "Overdue assignment";
                message = `"${assignment.title}" is past its deadline.`;
            } else if (daysLeft === 0) {
                category = "today";
                title = "Deadline today";
                message = `"${assignment.title}" is due today.`;
            } else if (daysLeft === 1) {
                category = "tomorrow";
                title = "Deadline tomorrow";
                message = `"${assignment.title}" is due tomorrow.`;
            }

            if (!category) {
                return;
            }

            const uniqueKey = `deadline-${assignment.id}-${assignment.dueDate}-${category}`;

            if (!seen.has(uniqueKey)) {
                addNotification(title, message, uniqueKey);
                seen.add(uniqueKey);
            }
        });

        writeStorage(SEEN_DEADLINES_KEY, [...seen]);
    }

    // Initial setup.
    renderNotifications();
    checkDeadlines();

    // Recheck deadlines periodically while the page is open.
    setInterval(checkDeadlines, 60 * 1000);

    // Recheck when returning to the browser tab.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            checkDeadlines();
        }
    });

    console.log("SmartPlan notifications are running.");
})();