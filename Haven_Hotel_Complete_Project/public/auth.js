const $ = (id) => document.getElementById(id);

// Tab switching
const tabSignInBtn = $("tabSignInBtn");
const tabRegisterBtn = $("tabRegisterBtn");
const tabSignIn = $("tabSignIn");
const tabRegister = $("tabRegister");

tabSignInBtn?.addEventListener("click", () => {
  tabSignInBtn.classList.add("active");
  tabRegisterBtn.classList.remove("active");
  tabSignIn.classList.add("active");
  tabRegister.classList.remove("active");
});

tabRegisterBtn?.addEventListener("click", () => {
  tabRegisterBtn.classList.add("active");
  tabSignInBtn.classList.remove("active");
  tabRegister.classList.add("active");
  tabSignIn.classList.remove("active");
});

// Password visibility toggles
document.querySelectorAll(".btn-toggle-pass").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input = $(targetId);
    if (!input) return;
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "🙈";
    } else {
      input.type = "password";
      btn.textContent = "👁️";
    }
  });
});

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function showAlert(elId, text, isError = false) {
  const el = $(elId);
  if (!el) return;
  el.textContent = text;
  el.className = "alert-message " + (isError ? "error" : "success");
  el.style.display = "block";
}

function clearAlert(elId) {
  const el = $(elId);
  if (!el) return;
  el.textContent = "";
  el.className = "alert-message";
  el.style.display = "none";
}

function getRedirectUrl(fallback = "/") {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || fallback;
}

// Quick Demo Credential Autofillers
$("fillDemoGuest")?.addEventListener("click", () => {
  if ($("loginEmail")) $("loginEmail").value = "guest@havenhotel.in";
  if ($("loginPassword")) $("loginPassword").value = "Guest1234!";
  showAlert("signInAlert", "Demo guest credentials populated. Click Sign In to proceed.");
});

$("fillDemoAdmin")?.addEventListener("click", () => {
  if ($("loginEmail")) $("loginEmail").value = "admin";
  if ($("loginPassword")) $("loginPassword").value = "ChangeThisPassword123!";
  showAlert("signInAlert", "Staff Administrator credentials populated. Click Sign In to proceed.");
});

// Forgot Password Inline Form Toggle
$("forgotPassToggle")?.addEventListener("click", (e) => {
  e.preventDefault();
  $("signInForm").style.display = "none";
  $("resetPassForm").style.display = "block";
  clearAlert("resetAlert");
});

$("cancelResetBtn")?.addEventListener("click", () => {
  $("resetPassForm").style.display = "none";
  $("signInForm").style.display = "block";
  clearAlert("signInAlert");
});

// Reset Password Handler
$("resetPassForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert("resetAlert");

  const email = $("resetEmail").value.trim();
  const newPassword = $("resetNewPass").value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating Password...";

  try {
    const res = await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, newPassword })
    });

    showAlert("resetAlert", res.message || "Password updated! Redirecting to hotel...");
    setTimeout(() => {
      window.location.href = getRedirectUrl(res.redirect || "/");
    }, 800);
  } catch (err) {
    showAlert("resetAlert", err.message, true);
    submitBtn.disabled = false;
    submitBtn.textContent = "Save New Password & Sign In →";
  }
});

// Sign In Form Handler
$("signInForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert("signInAlert");

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;
  const submitBtn = $("signInSubmitBtn") || e.target.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Authenticating...";
  }

  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    showAlert("signInAlert", res.message || "Authenticated successfully.");
    setTimeout(() => {
      window.location.href = getRedirectUrl(res.redirect || "/");
    }, 600);
  } catch (err) {
    showAlert("signInAlert", err.message, true);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In to Haven →";
    }
  }
});

// Register Form Handler
$("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAlert("registerAlert");

  const fullName = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const phone = $("regPhone").value.trim();
  const password = $("regPassword").value;
  const submitBtn = $("regSubmitBtn") || e.target.querySelector('button[type="submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering Account...";
  }

  try {
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, phone, password })
    });

    showAlert("registerAlert", "Account created successfully! Redirecting...");
    setTimeout(() => {
      window.location.href = getRedirectUrl("/");
    }, 800);
  } catch (err) {
    showAlert("registerAlert", err.message, true);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Complete Registration →";
    }
  }
});

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[s]));
}

// Auto-check if already signed in
(async () => {
  try {
    const me = await api("/api/auth/me");
    if (me.authenticated && me.user) {
      const card = document.querySelector(".auth-card");
      if (card) {
        card.innerHTML = `
          <div class="brand-header">
            <a class="brand-logo" href="/">HAVEN<span>.</span></a>
            <span class="brand-badge">DELHI HERITAGE SANCTUARY</span>
          </div>
          <div style="text-align:center;padding:24px 0;">
            <div style="font-size:2rem;margin-bottom:12px;color:var(--gold-500);">✦</div>
            <h2 style="font-family:'Playfair Display',serif;margin-bottom:8px;color:var(--pine-900);">You Are Signed In</h2>
            <p style="color:var(--text-muted);font-size:0.95rem;margin-bottom:28px;">
              Active session as <strong>${escapeHtml(me.user.name)}</strong> (${escapeHtml(me.user.email)}).
            </p>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <a href="${me.isAdmin ? '/admin' : '/#mybooking'}" class="btn-submit-auth" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">
                ${me.isAdmin ? 'Open PMS Admin Portal →' : 'View My Stay & Reservations →'}
              </a>
              <a href="/" class="btn-submit-auth" style="background:#f4efe6;color:#192620;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">
                Return to Hotel Homepage
              </a>
              <button id="authPageSignOut" type="button" style="margin-top:10px;background:none;border:none;color:#8c2828;cursor:pointer;font-weight:600;font-size:0.85rem;text-decoration:underline;">
                Sign Out of This Session
              </button>
            </div>
          </div>
        `;
        $("authPageSignOut")?.addEventListener("click", async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          window.location.reload();
        });
      }
    }
  } catch (_) {}
})();
