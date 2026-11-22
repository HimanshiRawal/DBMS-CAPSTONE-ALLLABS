const $ = (id) => document.getElementById(id);
const messageBox = $("adminMessage");
let messageTimer = null;

function showToast(text) {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.style.display = "block";
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }, 3500);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function getBookingStatusBadge(status) {
  const styles = {
    "Confirmed": "background:#eef7f2;color:#196140;border:1px solid #b8dfcb;",
    "Checked In": "background:#eef2ff;color:#3730a3;border:1px solid #c7d2fe;",
    "Checked Out": "background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;",
    "Cancelled": "background:#fdf2f2;color:#991b1b;border:1px solid #fecaca;"
  };
  const style = styles[status] || "background:#f4efe6;color:#5e6f67;";
  return `<span style="display:inline-block;padding:3px 9px;border-radius:9999px;font-size:0.75rem;font-weight:700;letter-spacing:0.04em;${style}">${escapeHtml(status)}</span>`;
}

function getPaymentStatusBadge(status) {
  const styles = {
    "Completed": "background:#eef7f2;color:#196140;border:1px solid #b8dfcb;",
    "Paid": "background:#eef7f2;color:#196140;border:1px solid #b8dfcb;",
    "Pending": "background:#fffbeb;color:#92400e;border:1px solid #fde68a;",
    "Refunded": "background:#faf5ff;color:#6b21a8;border:1px solid #e9d5ff;"
  };
  const style = styles[status] || styles["Pending"];
  return `<span style="display:inline-block;padding:3px 9px;border-radius:9999px;font-size:0.75rem;font-weight:700;letter-spacing:0.04em;${style}">${escapeHtml(status || "Pending")}</span>`;
}

function getRoomStatusBadge(status) {
  const styles = {
    "Available": "background:#eef7f2;color:#196140;border:1px solid #b8dfcb;",
    "Maintenance": "background:#fffbeb;color:#92400e;border:1px solid #fde68a;",
    "Unavailable": "background:#fdf2f2;color:#991b1b;border:1px solid #fecaca;"
  };
  const style = styles[status] || "background:#f4efe6;color:#5e6f67;";
  return `<span style="display:inline-block;padding:3px 9px;border-radius:9999px;font-size:0.75rem;font-weight:700;letter-spacing:0.04em;${style}">${escapeHtml(status)}</span>`;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = "/admin-login";
    throw new Error("Admin session expired.");
  }
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

async function loadDashboard() {
  const d = await api("/api/dashboard");
  $("totalRooms").textContent = d.rooms;
  $("totalGuests").textContent = d.guests;
  $("totalReservations").textContent = d.reservations;
  $("pendingPayments").textContent = d.pendingPayments;
}

async function loadReservations() {
  const rows = await api("/api/reservations");
  $("reservationsBody").innerHTML = rows.map((r) => `
    <tr>
      <td><strong>#${r.ReservationID}</strong></td>
      <td><strong>${escapeHtml(r.GuestName)}</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(r.Email)}</span><br><span style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(r.Phone)}</span></td>
      <td><strong>${escapeHtml(r.RoomType)}</strong><br><span style="font-size:0.78rem;color:var(--text-muted);">Suite #${escapeHtml(r.RoomNumber)}</span></td>
      <td>${escapeHtml(r.CheckIn)} → ${escapeHtml(r.CheckOut)}</td>
      <td><strong>${money(r.Amount)}</strong></td>
      <td>${getBookingStatusBadge(r.BookingStatus)}</td>
      <td>${getPaymentStatusBadge(r.PaymentStatus)}</td>
      <td>
        <select data-reservation="${r.ReservationID}">
          <option ${r.BookingStatus === "Confirmed" ? "selected" : ""}>Confirmed</option>
          <option ${r.BookingStatus === "Checked In" ? "selected" : ""}>Checked In</option>
          <option ${r.BookingStatus === "Checked Out" ? "selected" : ""}>Checked Out</option>
          <option ${r.BookingStatus === "Cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function loadRooms() {
  const rows = await api("/api/rooms");
  $("roomsBody").innerHTML = rows.map((r) => `
    <tr>
      <td>#${r.RoomID}</td>
      <td><strong>Suite ${escapeHtml(r.RoomNumber)}</strong></td>
      <td>${escapeHtml(r.RoomType)}</td>
      <td><strong>${money(r.PricePerNight)}</strong></td>
      <td>Up to ${r.Capacity} Guests</td>
      <td>${getRoomStatusBadge(r.Status)}</td>
      <td>
        <select data-room="${r.RoomID}">
          <option ${r.Status === "Available" ? "selected" : ""}>Available</option>
          <option ${r.Status === "Maintenance" ? "selected" : ""}>Maintenance</option>
          <option ${r.Status === "Unavailable" ? "selected" : ""}>Unavailable</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function loadServices() {
  const rows = await api("/api/services");
  $("servicesBody").innerHTML = rows.map((s) => `
    <tr>
      <td>#${s.ServiceID}</td>
      <td><strong>${escapeHtml(s.ServiceName)}</strong></td>
      <td>${escapeHtml(s.Description || "Standard service")}</td>
      <td>${Number(s.Price) === 0 ? "Complimentary" : money(s.Price)}</td>
    </tr>
  `).join("");
}

async function loadPayments() {
  const rows = await api("/api/payments");
  $("paymentsBody").innerHTML = rows.map((p) => `
    <tr>
      <td>#${p.PaymentID}</td>
      <td><strong>Res #${p.ReservationID}</strong></td>
      <td>${escapeHtml(p.GuestName)}<br><small style="color:var(--text-muted);">${escapeHtml(p.Email)}</small></td>
      <td><strong>${money(p.Amount)}</strong></td>
      <td><span style="font-weight:600;font-size:0.8rem;background:#f5f2eb;padding:3px 8px;border-radius:4px;">${escapeHtml(p.PaymentMethod || "UPI")}</span></td>
      <td>${getPaymentStatusBadge(p.PaymentStatus)}</td>
      <td>
        <select data-payment="${p.PaymentID}">
          <option ${p.PaymentStatus === "Pending" ? "selected" : ""}>Pending</option>
          <option ${p.PaymentStatus === "Paid" || p.PaymentStatus === "Completed" ? "selected" : ""}>Paid</option>
          <option ${p.PaymentStatus === "Refunded" ? "selected" : ""}>Refunded</option>
        </select>
      </td>
    </tr>
  `).join("");
}

async function loadGuests() {
  const rows = await api("/api/guests");
  $("guestsBody").innerHTML = rows.map((g) => `
    <tr>
      <td>#${g.GuestID}</td>
      <td><strong>${escapeHtml(g.FullName)}</strong></td>
      <td><a href="mailto:${escapeHtml(g.Email)}" style="color:var(--pine-900);text-decoration:underline;">${escapeHtml(g.Email)}</a></td>
      <td>${escapeHtml(g.Phone)}</td>
    </tr>
  `).join("");
}

async function refreshAll() {
  try {
    await Promise.all([
      loadDashboard(),
      loadReservations(),
      loadRooms(),
      loadServices(),
      loadPayments(),
      loadGuests()
    ]);
  } catch (e) {
    showToast(e.message);
  }
}

document.addEventListener("change", async (event) => {
  try {
    if (event.target.dataset.reservation) {
      await api(`/api/reservations/${event.target.dataset.reservation}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: event.target.value })
      });
      showToast("Reservation lifecycle status updated.");
      await refreshAll();
    }
    if (event.target.dataset.room) {
      await api(`/api/rooms/${event.target.dataset.room}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: event.target.value })
      });
      showToast("Room inventory status updated.");
      await loadRooms();
      await loadDashboard();
    }
    if (event.target.dataset.payment) {
      await api(`/api/payments/${event.target.dataset.payment}`, {
        method: "PATCH",
        body: JSON.stringify({ status: event.target.value })
      });
      showToast("Payment transaction status updated.");
      await loadPayments();
      await loadDashboard();
    }
  } catch (e) {
    showToast(e.message);
  }
});

$("roomForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        roomNumber: $("roomNumber").value,
        roomType: $("roomType").value,
        pricePerNight: $("roomPrice").value,
        capacity: $("roomCapacity").value
      })
    });
    e.target.reset();
    showToast("New suite added to hotel inventory.");
    await loadRooms();
    await loadDashboard();
  } catch (err) {
    showToast(err.message);
  }
});

$("serviceForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/api/services", {
      method: "POST",
      body: JSON.stringify({
        serviceName: $("serviceName").value,
        description: $("serviceDescription").value,
        servicePrice: $("servicePrice").value
      })
    });
    e.target.reset();
    showToast("New hospitality service added.");
    await loadServices();
  } catch (err) {
    showToast(err.message);
  }
});

document.querySelectorAll("[data-load]").forEach((button) =>
  button.addEventListener("click", async () => {
    const origText = button.textContent;
    button.disabled = true;
    button.textContent = "Refreshing...";
    button.style.opacity = "0.7";
    try {
      const fn = {
        reservations: loadReservations,
        payments: loadPayments,
        guests: loadGuests
      }[button.dataset.load];
      if (fn) await fn();
      showToast("Ledger data refreshed successfully.");
    } catch (e) {
      showToast(e.message);
    } finally {
      button.disabled = false;
      button.textContent = origText;
      button.style.opacity = "";
    }
  })
);

$("logoutButton")?.addEventListener("click", async () => {
  if (confirm("Are you sure you want to log out of the admin console?")) {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/admin-login";
  }
});

refreshAll();
