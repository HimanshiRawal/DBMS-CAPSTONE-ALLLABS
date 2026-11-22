const $ = (id) => document.getElementById(id);
let selectedRoomId = null;

const ROOM_PHOTOS = {
  "Standard Non-AC": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80",
  "Standard AC": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80",
  "Deluxe AC": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
  "Family Room": "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80",
  "Presidential Suite": "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80"
};

const DEFAULT_ROOM_PHOTO = "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1000&q=80";

const SERVICE_ICONS = {
  "Room Service": "🛎️",
  "Laundry Service": "🧺",
  "Airport Transfer": "🚘",
  "Travel Assistance": "🧭",
  "Spa & Massage": "🌿"
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return Math.max(1, Math.round((end - start) / 86400000));
}

// ==========================================
// LOAD ROOMS SHOWCASE
// ==========================================
async function loadRooms() {
  const container = $("roomList");
  if (!container) return;

  try {
    const rooms = await api("/api/rooms");
    if (!rooms.length) {
      container.innerHTML = '<p class="muted">Our suites are currently undergoing curated updates.</p>';
      return;
    }

    container.innerHTML = rooms.map((room) => {
      const photoUrl = ROOM_PHOTOS[room.RoomType] || DEFAULT_ROOM_PHOTO;
      const isAvailable = room.Status === "Available";
      const statusClass = isAvailable ? "badge-available" : "badge-maintenance";

      return `
        <article class="room-card card" data-room-id="${room.RoomID}">
          <div class="room-media">
            <img src="${photoUrl}" alt="${escapeHtml(room.RoomType)}" loading="lazy">
            <span class="room-tag">Room ${escapeHtml(room.RoomNumber)}</span>
            <span class="room-status-badge ${statusClass}">${escapeHtml(room.Status)}</span>
          </div>
          <div class="room-content">
            <h3>${escapeHtml(room.RoomType)}</h3>
            <div class="room-meta">
              <span>👤 Up to ${room.Capacity} Guests</span>
              <span>✦ Teak Furnished</span>
            </div>
            <div class="room-features">
              <span class="feature-pill">Egyptian Linen</span>
              <span class="feature-pill">Rain Shower</span>
              <span class="feature-pill">High-Speed Wi-Fi</span>
            </div>
            <div class="room-footer">
              <div class="price-box">
                <span class="price-prefix">From</span>
                <span class="price-amount">${money(room.PricePerNight)}</span>
                <span class="price-period">per night · taxes incl.</span>
              </div>
              <button class="btn-select-room" onclick="quickSelectRoom(${room.RoomID})">
                Select Suite
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

// Quick select suite from card
window.quickSelectRoom = function (roomId) {
  window.desiredRoomId = roomId;

  const bookingSection = $("booking");
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: "smooth" });
  }

  // Ensure dates are valid before searching
  if ($("checkIn") && !$("checkIn").value) {
    $("checkIn").value = todayStr;
  }
  if ($("checkOut") && !$("checkOut").value) {
    $("checkOut").value = tomorrowStr;
  }

  const searchBtn = $("searchRooms");
  if (searchBtn) {
    searchBtn.click();
  }
};

// ==========================================
// LOAD HOTEL SERVICES
// ==========================================
async function loadServices() {
  const container = $("serviceList");
  if (!container) return;

  try {
    const services = await api("/api/services");
    if (!services.length) {
      container.innerHTML = '<p class="muted">Services will be listed here shortly.</p>';
      return;
    }

    container.innerHTML = services.map((service) => {
      const icon = SERVICE_ICONS[service.ServiceName] || "✦";
      const isFree = Number(service.Price) === 0;

      return `
        <article class="service-card card">
          <div class="service-icon-wrap">${icon}</div>
          <h3>${escapeHtml(service.ServiceName)}</h3>
          <p>${escapeHtml(service.Description || "Available upon request from the 24/7 concierge.")}</p>
          <span class="service-price-pill">
            ${isFree ? "Complimentary" : money(service.Price)}
          </span>
        </article>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

// ==========================================
// DATE CONSTRAINTS & INITIALIZATION
// ==========================================
const todayStr = new Date().toISOString().slice(0, 10);
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

if ($("checkIn")) {
  $("checkIn").min = todayStr;
  if (!$("checkIn").value) $("checkIn").value = todayStr;

  $("checkIn").addEventListener("change", () => {
    $("checkOut").min = $("checkIn").value;
    if ($("checkOut").value && $("checkOut").value <= $("checkIn").value) {
      const nextDay = new Date($("checkIn").value);
      nextDay.setDate(nextDay.getDate() + 1);
      $("checkOut").value = nextDay.toISOString().slice(0, 10);
    }
  });
}

if ($("checkOut")) {
  $("checkOut").min = tomorrowStr;
  if (!$("checkOut").value) $("checkOut").value = tomorrowStr;
}

// Sync floating bar with booking form if present
if ($("heroCheckIn")) {
  $("heroCheckIn").min = todayStr;
  $("heroCheckIn").value = todayStr;

  $("heroCheckIn").addEventListener("change", () => {
    if ($("heroCheckOut")) {
      $("heroCheckOut").min = $("heroCheckIn").value;
      if ($("heroCheckOut").value && $("heroCheckOut").value <= $("heroCheckIn").value) {
        const nextDay = new Date($("heroCheckIn").value);
        nextDay.setDate(nextDay.getDate() + 1);
        $("heroCheckOut").value = nextDay.toISOString().slice(0, 10);
      }
    }
    if ($("checkIn")) {
      $("checkIn").value = $("heroCheckIn").value;
    }
  });
}

if ($("heroCheckOut")) {
  $("heroCheckOut").min = tomorrowStr;
  $("heroCheckOut").value = tomorrowStr;

  $("heroCheckOut").addEventListener("change", () => {
    if ($("checkOut")) {
      $("checkOut").value = $("heroCheckOut").value;
    }
  });
}

if ($("heroSearchBtn")) {
  $("heroSearchBtn").addEventListener("click", () => {
    const btn = $("heroSearchBtn");
    btn.style.transform = "scale(0.97)";
    setTimeout(() => { btn.style.transform = ""; }, 150);

    if ($("checkIn") && $("heroCheckIn")) $("checkIn").value = $("heroCheckIn").value;
    if ($("checkOut") && $("heroCheckOut")) $("checkOut").value = $("heroCheckOut").value;
    if ($("guestsCount") && $("heroGuests")) $("guestsCount").value = $("heroGuests").value;

    const bookingSection = $("booking");
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: "smooth" });
    }

    const searchBtn = $("searchRooms");
    if (searchBtn) {
      searchBtn.click();
    }
  });
}

// ==========================================
// CHECK AVAILABILITY
// ==========================================
if ($("searchRooms")) {
  $("searchRooms").addEventListener("click", async () => {
    const checkIn = $("checkIn").value;
    const checkOut = $("checkOut").value;
    const guests = $("guestsCount").value;
    const container = $("availableRooms");

    selectedRoomId = null;
    container.innerHTML = "";

    if (!checkIn || !checkOut || checkOut <= checkIn) {
      container.innerHTML = '<p class="message-box error">Please select valid arrival and departure dates.</p>';
      return;
    }

    container.innerHTML = '<p class="muted" style="padding:10px;">Checking luxury inventory...</p>';

    try {
      const rooms = await api(
        `/api/rooms/available?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`
      );

      if (!rooms.length) {
        container.innerHTML = '<p class="message-box error">No suites are available for the selected dates and guest count. Please try alternate dates.</p>';
        return;
      }

      const nights = nightsBetween(checkIn, checkOut);

      container.innerHTML = `
        <div style="margin-bottom:8px;font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-bronze-600)">
          ✦ Available Suites (${rooms.length} found for ${nights} night${nights > 1 ? "s" : ""})
        </div>
        <div class="available-rooms-box">
          ${rooms.map((room) => {
            const totalForStay = Number(room.price_per_night) * nights;
            return `
              <label class="room-radio-option" id="label-room-${room.room_id}">
                <input type="radio" name="selectedRoom" value="${room.room_id}">
                <div class="room-radio-details">
                  <span class="room-radio-title">${escapeHtml(room.room_type)} · Room ${escapeHtml(room.room_number)}</span>
                  <span class="room-radio-sub">Capacity: up to ${room.capacity} guests · ${money(room.price_per_night)} / night</span>
                </div>
                <div style="text-align:right">
                  <span class="room-radio-price">${money(totalForStay)}</span>
                  <div style="font-size:0.7rem;color:var(--color-muted);">${nights} night${nights > 1 ? "s" : ""} total</div>
                </div>
              </label>
            `;
          }).join("")}
        </div>
      `;

      container.querySelectorAll('input[name="selectedRoom"]').forEach((radio) => {
        radio.addEventListener("change", () => {
          selectedRoomId = Number(radio.value);
          // Highlight selected label
          container.querySelectorAll(".room-radio-option").forEach((el) => {
            el.style.borderColor = "var(--color-border)";
            el.style.backgroundColor = "var(--color-surface)";
          });
          const activeLabel = $(`label-room-${selectedRoomId}`);
          if (activeLabel) {
            activeLabel.style.borderColor = "var(--color-bronze-500)";
            activeLabel.style.backgroundColor = "var(--color-surface-tint)";
          }
        });
      });

      // Auto select desired suite if selected via card, or default to first
      let radioToSelect = null;
      if (window.desiredRoomId) {
        radioToSelect = container.querySelector(`input[name="selectedRoom"][value="${window.desiredRoomId}"]`);
        window.desiredRoomId = null;
      }
      if (!radioToSelect) {
        radioToSelect = container.querySelector('input[name="selectedRoom"]');
      }
      if (radioToSelect) {
        radioToSelect.click();
      }

    } catch (error) {
      container.innerHTML = `<p class="message-box error">${escapeHtml(error.message)}</p>`;
    }
  });
}

// ==========================================
// SUBMIT RESERVATION
// ==========================================
if ($("bookingForm")) {
  $("bookingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("bookingMessage");
    message.className = "message-box";
    message.style.display = "none";
    message.textContent = "";

    if (!selectedRoomId) {
      message.className = "message-box error";
      message.textContent = "Please check availability and select a suite before continuing.";
      message.style.display = "block";
      return;
    }

    const submitBtn = $("bookingForm").querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Securing Reservation...";
    }

    try {
      const emailVal = $("email").value.trim();
      const result = await api("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          fullName: $("guestName").value.trim(),
          email: emailVal,
          phone: $("phone").value.trim(),
          checkIn: $("checkIn").value,
          checkOut: $("checkOut").value,
          guests: $("guestsCount").value,
          roomId: selectedRoomId
        })
      });

      window.location.href = `/payment.html?reservationId=${result.reservationId}&email=${encodeURIComponent(emailVal)}`;
    } catch (error) {
      message.className = "message-box error";
      message.textContent = error.message;
      message.style.display = "block";

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Continue to Payment";
      }
    }
  });
}

// ==========================================
// LOOKUP RESERVATION DOSSIER
// ==========================================
if ($("lookupForm")) {
  $("lookupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const resultBox = $("lookupResult");
    resultBox.innerHTML = '<p class="muted" style="padding:15px;">Searching hotel archives...</p>';

    const id = $("reservationId").value;
    const email = $("lookupEmail").value.trim();

    try {
      const booking = await api(
        `/api/my-booking/${encodeURIComponent(id)}?email=${encodeURIComponent(email)}`
      );

      const canCancel = booking.booking_status === "Confirmed";
      const statusClass = booking.booking_status === "Confirmed" ? "status-confirmed" : "status-cancelled";

      resultBox.innerHTML = `
        <div class="booking-result-dossier">
          <div class="dossier-header">
            <div>
              <span style="font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold-600);font-weight:700;">CONFIRMED STAY</span>
              <h3>Reservation #${booking.reservation_id}</h3>
            </div>
            <span class="dossier-status-pill ${statusClass}">${escapeHtml(booking.booking_status)}</span>
          </div>

          <div class="dossier-grid">
            <div class="dossier-item">
              <span>Primary Guest</span>
              <strong>${escapeHtml(booking.full_name)}</strong>
            </div>
            <div class="dossier-item">
              <span>Suite / Room</span>
              <strong>${escapeHtml(booking.room_type)} (${escapeHtml(booking.room_number)})</strong>
            </div>
            <div class="dossier-item">
              <span>Check-In Date</span>
              <strong>${escapeHtml(booking.check_in)}</strong>
            </div>
            <div class="dossier-item">
              <span>Check-Out Date</span>
              <strong>${escapeHtml(booking.check_out)}</strong>
            </div>
            <div class="dossier-item">
              <span>Total Amount</span>
              <strong>${money(booking.amount)}</strong>
            </div>
            <div class="dossier-item">
              <span>Payment Status</span>
              <strong>${escapeHtml(booking.payment_status || "Pending")}</strong>
            </div>
          </div>

          ${
            canCancel
              ? `
            <div class="dossier-actions">
              <button class="btn-cancel-reservation" id="cancelBooking">
                Cancel Reservation
              </button>
            </div>
          `
              : ""
          }
        </div>
      `;

      const cancelButton = $("cancelBooking");
      if (cancelButton) {
        cancelButton.addEventListener("click", async () => {
          if (!confirm("Are you certain you wish to cancel this booking?")) return;
          try {
            const cancelled = await api(`/api/my-booking/${encodeURIComponent(id)}/cancel`, {
              method: "PATCH",
              body: JSON.stringify({ email })
            });

            resultBox.innerHTML = `
              <div class="booking-result-dossier">
                <div class="dossier-header">
                  <h3>Reservation #${booking.reservation_id}</h3>
                  <span class="dossier-status-pill status-cancelled">Cancelled</span>
                </div>
                <p style="color:var(--text-dark);font-size:0.92rem;margin-top:10px;">${escapeHtml(cancelled.message)}</p>
              </div>
            `;
          } catch (err) {
            alert(err.message);
          }
        });
      }
    } catch (error) {
      resultBox.innerHTML = `<p class="message-box error">${escapeHtml(error.message)}</p>`;
    }
  });
}

// Initial triggers
loadRooms();
loadServices();


// ==========================================
// SESSION STATE & USER RECOGNITION
// ==========================================
async function checkAuthSession() {
  try {
    const authData = await api("/api/auth/me");
    const navActions = document.querySelector(".nav-actions");
    const topNoticeRight = $("topNoticeRight");

    if (authData.authenticated && authData.user) {
      const user = authData.user;
      const firstName = user.name ? user.name.split(" ")[0] : "Guest";

      if (navActions) {
        if (authData.isAdmin) {
          navActions.innerHTML = `
            <a class="btn-user-badge" href="/admin" title="Access Property Management System">🛡️ Admin (${escapeHtml(firstName)})</a>
            <button class="btn-signout" id="signOutBtn" type="button">Sign Out</button>
            <a class="btn-reserve-nav" href="#booking">Reserve A Suite</a>
          `;
        } else {
          navActions.innerHTML = `
            <a class="btn-user-badge" href="#mybooking" title="View my stay records">✦ ${escapeHtml(firstName)} (My Stay)</a>
            <button class="btn-signout" id="signOutBtn" type="button">Sign Out</button>
            <a class="btn-reserve-nav" href="#booking">Reserve A Suite</a>
          `;
        }

        $("signOutBtn")?.addEventListener("click", handleSignOut);
      }

      if (topNoticeRight) {
        topNoticeRight.innerHTML = `
          <span style="color:var(--color-accent);font-weight:600;">✦ Signed in: ${escapeHtml(firstName)}</span>
          <a href="#mybooking">My Stay</a>
          <a href="#" id="topSignOutLink">Sign Out</a>
          <a href="${authData.isAdmin ? '/admin' : '/admin-login'}">${authData.isAdmin ? 'PMS Console' : 'Staff Access'}</a>
        `;
        $("topSignOutLink")?.addEventListener("click", (e) => {
          e.preventDefault();
          handleSignOut();
        });
      }

      // Pre-fill booking form fields
      if ($("guestName") && !$("guestName").value && user.name) {
        $("guestName").value = user.name;
      }
      if ($("email") && !$("email").value && user.email) {
        $("email").value = user.email;
      }
      if ($("phone") && !$("phone").value && user.phone) {
        $("phone").value = user.phone;
      }
      if ($("lookupEmail") && !$("lookupEmail").value && user.email) {
        $("lookupEmail").value = user.email;
      }

      // Load their itinerary list into lookupResult
      if (!authData.isAdmin) {
        loadMyBookings(user);
      }
    } else {
      const authBtn = $("authNavBtn");
      if (authBtn) {
        authBtn.textContent = "Sign In / Register";
        authBtn.href = "/auth";
        authBtn.onclick = (e) => {
          e.preventDefault();
          openAuthModal();
        };
      }

      if (topNoticeRight) {
        topNoticeRight.innerHTML = `
          <a href="tel:+911123581000">☎ +91 11 2358 1000</a>
          <a href="#location">📍 Directions</a>
          <a href="/admin-login">Staff Access</a>
        `;
      }
    }
  } catch (_) {}
}

async function handleSignOut() {
  if (confirm("Are you sure you wish to sign out?")) {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.reload();
  }
}

async function loadMyBookings(user) {
  const resultBox = $("lookupResult");
  if (!resultBox) return;

  try {
    const bookings = await api("/api/my-bookings");
    if (!bookings || !bookings.length) {
      resultBox.innerHTML = `
        <div class="booking-result-dossier" style="text-align:center;padding:24px;margin-top:20px;">
          <p style="font-size:1rem;color:var(--color-primary);font-weight:600;margin-bottom:6px;">
            Welcome back, ${escapeHtml(user ? user.name : 'Guest')}!
          </p>
          <p style="font-size:0.88rem;color:var(--color-muted);margin-bottom:14px;">
            You currently have no reservation records under <strong>${escapeHtml(user ? user.email : '')}</strong>.
          </p>
          <a href="#booking" class="btn-check-rates" style="display:inline-flex;height:44px;min-height:44px;font-size:11px;padding:0 22px;">
            Reserve Your First Suite ↓
          </a>
        </div>
      `;
      return;
    }

    resultBox.innerHTML = `
      <div style="margin-top:24px;">
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-primary);margin-bottom:12px;">
          ✦ YOUR ACTIVE & PREVIOUS RESERVATIONS (${bookings.length})
        </div>
        ${bookings.map(b => `
          <div class="booking-result-dossier" style="margin-bottom:16px;">
            <div class="dossier-header">
              <div>
                <span style="font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-muted);font-weight:700;">RESERVATION #${b.reservation_id}</span>
                <h3 style="margin-top:2px;">${escapeHtml(b.room_type)} (Suite ${escapeHtml(b.room_number)})</h3>
              </div>
              <span class="dossier-status-pill ${b.booking_status === 'Confirmed' ? 'status-confirmed' : 'status-cancelled'}">
                ${escapeHtml(b.booking_status)}
              </span>
            </div>
            <div class="dossier-grid">
              <div class="dossier-item">
                <span>Check-in</span>
                <strong>${escapeHtml(b.check_in)}</strong>
              </div>
              <div class="dossier-item">
                <span>Check-out</span>
                <strong>${escapeHtml(b.check_out)}</strong>
              </div>
              <div class="dossier-item">
                <span>Total Amount</span>
                <strong>${money(b.amount)}</strong>
              </div>
              <div class="dossier-item">
                <span>Payment Status</span>
                <strong>${escapeHtml(b.payment_status)}</strong>
              </div>
            </div>
            ${b.payment_status === 'Pending' ? `
              <div style="padding-top:12px;border-top:1px solid var(--color-border);display:flex;justify-content:flex-end;">
                <a href="/payment.html?reservationId=${b.reservation_id}&email=${encodeURIComponent(b.email)}" class="btn-lookup" style="text-decoration:none;font-size:0.76rem;padding:8px 16px;height:auto;min-height:auto;">
                  Complete Payment →
                </a>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch (_) {}
}

// ==========================================
// QUICK AUTH MODAL CONTROLLER
// ==========================================
function openAuthModal() {
  const modal = $("authModalBackdrop");
  if (!modal) {
    window.location.href = "/auth";
    return;
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  const modal = $("authModalBackdrop");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

$("modalCloseBtn")?.addEventListener("click", closeAuthModal);
$("authModalBackdrop")?.addEventListener("click", (e) => {
  if (e.target === $("authModalBackdrop")) closeAuthModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAuthModal();
});

// Modal tab switches
$("modalTabSignInBtn")?.addEventListener("click", () => {
  $("modalTabSignInBtn").classList.add("active");
  $("modalTabRegBtn")?.classList.remove("active");
  if ($("modalSignInForm")) $("modalSignInForm").style.display = "block";
  if ($("modalRegForm")) $("modalRegForm").style.display = "none";
});

$("modalTabRegBtn")?.addEventListener("click", () => {
  $("modalTabRegBtn").classList.add("active");
  $("modalTabSignInBtn")?.classList.remove("active");
  if ($("modalRegForm")) $("modalRegForm").style.display = "block";
  if ($("modalSignInForm")) $("modalSignInForm").style.display = "none";
});

// Modal quick fill demo credentials
$("modalDemoGuest")?.addEventListener("click", () => {
  if ($("modalLoginEmail")) $("modalLoginEmail").value = "guest@havenhotel.in";
  if ($("modalLoginPassword")) $("modalLoginPassword").value = "Guest1234!";
});

$("modalDemoAdmin")?.addEventListener("click", () => {
  if ($("modalLoginEmail")) $("modalLoginEmail").value = "admin";
  if ($("modalLoginPassword")) $("modalLoginPassword").value = "ChangeThisPassword123!";
});

// Modal Sign In Submit
$("modalSignInForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const alertEl = $("modalSignInAlert");
  if (alertEl) {
    alertEl.textContent = "";
    alertEl.style.display = "none";
  }

  const email = $("modalLoginEmail").value.trim();
  const password = $("modalLoginPassword").value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Authenticating...";
  }

  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    closeAuthModal();
    if (res.isAdmin) {
      window.location.href = "/admin";
    } else {
      checkAuthSession();
    }
  } catch (err) {
    if (alertEl) {
      alertEl.className = "message-box error";
      alertEl.textContent = err.message;
      alertEl.style.display = "block";
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In to Haven →";
    }
  }
});

// Modal Register Submit
$("modalRegForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const alertEl = $("modalRegAlert");
  if (alertEl) {
    alertEl.textContent = "";
    alertEl.style.display = "none";
  }

  const fullName = $("modalRegName").value.trim();
  const email = $("modalRegEmail").value.trim();
  const phone = $("modalRegPhone").value.trim();
  const password = $("modalRegPass").value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Account...";
  }

  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, phone, password })
    });

    closeAuthModal();
    checkAuthSession();
  } catch (err) {
    if (alertEl) {
      alertEl.className = "message-box error";
      alertEl.textContent = err.message;
      alertEl.style.display = "block";
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account & Sign In →";
    }
  }
});

checkAuthSession();
