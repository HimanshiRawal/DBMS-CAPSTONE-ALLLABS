const assert = require("assert");
const http = require("http");

const BASE_URL = "http://localhost:3001";
let sessionCookie = "";

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers
      },
      (res) => {
        let data = "";
        if (res.headers["set-cookie"]) {
          const rawCookie = res.headers["set-cookie"][0];
          sessionCookie = rawCookie.split(";")[0];
        }
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on("error", reject);

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting Haven Hotel Backend Verification Tests...\n");

  // 1. Health check
  console.log("1. Testing GET /api/health...");
  const health = await request("/api/health");
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, "ok");
  assert.strictEqual(health.data.database, "MongoDB");
  console.log("   -> OK");

  // 2. Demo QR code
  console.log("2. Testing GET /api/demo-qr...");
  const qr = await request("/api/demo-qr");
  assert.strictEqual(qr.status, 200);
  assert(qr.data.qrDataUrl && qr.data.qrDataUrl.startsWith("data:image/png;base64,"));
  console.log("   -> OK");

  // 3. Get all rooms
  console.log("3. Testing GET /api/rooms...");
  const rooms = await request("/api/rooms");
  assert.strictEqual(rooms.status, 200);
  assert(Array.isArray(rooms.data) && rooms.data.length >= 4);
  assert(rooms.data[0].RoomNumber && rooms.data[0].RoomType && rooms.data[0].RoomID);
  console.log(`   -> Found ${rooms.data.length} rooms. OK`);

  // 4. Get all services
  console.log("4. Testing GET /api/services...");
  const services = await request("/api/services");
  assert.strictEqual(services.status, 200);
  assert(Array.isArray(services.data) && services.data.length >= 4);
  assert(services.data[0].ServiceName && services.data[0].ServiceID);
  console.log(`   -> Found ${services.data.length} services. OK`);

  // 5. Available rooms
  console.log("5. Testing GET /api/rooms/available...");
  const available = await request("/api/rooms/available?checkIn=2026-12-01&checkOut=2026-12-05&guests=2");
  assert.strictEqual(available.status, 200);
  assert(Array.isArray(available.data) && available.data.length > 0);
  const selectedRoom = available.data[0];
  assert(selectedRoom.room_id && selectedRoom.price_per_night);
  console.log(`   -> Found ${available.data.length} available rooms. OK`);

  // 6. Create reservation
  console.log("6. Testing POST /api/reservations...");
  const testEmail = `testguest_${Date.now()}@example.com`;
  const bookingRes = await request("/api/reservations", {
    method: "POST",
    body: {
      fullName: "Test User",
      email: testEmail,
      phone: "+91 9876543210",
      roomId: selectedRoom.room_id,
      checkIn: "2026-12-01",
      checkOut: "2026-12-05",
      guests: 2
    }
  });
  assert.strictEqual(bookingRes.status, 201);
  const reservationId = bookingRes.data.reservationId;
  assert(reservationId);
  assert.strictEqual(bookingRes.data.nights, 4);
  console.log(`   -> Created Reservation #${reservationId} for ${testEmail}. OK`);

  // 7. Double-booking check
  console.log("7. Testing Double-Booking Overlap Prevention...");
  const duplicateBooking = await request("/api/reservations", {
    method: "POST",
    body: {
      fullName: "Another User",
      email: "another@example.com",
      phone: "+91 9999999999",
      roomId: selectedRoom.room_id,
      checkIn: "2026-12-02",
      checkOut: "2026-12-04",
      guests: 1
    }
  });
  assert.strictEqual(duplicateBooking.status, 409);
  console.log("   -> Overlapping booking successfully rejected with 409 Conflict. OK");

  // 8. Lookup booking
  console.log("8. Testing GET /api/my-booking/:id...");
  const myBooking = await request(`/api/my-booking/${reservationId}?email=${encodeURIComponent(testEmail)}`);
  assert.strictEqual(myBooking.status, 200);
  assert.strictEqual(myBooking.data.reservation_id, reservationId);
  assert.strictEqual(myBooking.data.booking_status, "Confirmed");
  assert.strictEqual(myBooking.data.payment_status, "Pending");
  console.log("   -> Booking lookup verified. OK");

  // 9. Payment details & method update
  console.log("9. Testing POST /api/payment-method/:id and demo payment...");
  const updateMethod = await request(`/api/payment-method/${reservationId}`, {
    method: "POST",
    body: {
      email: testEmail,
      paymentMethod: "UPI"
    }
  });
  assert.strictEqual(updateMethod.status, 200);

  const completePayment = await request(`/api/payment-demo/${reservationId}`, {
    method: "POST",
    body: {
      email: testEmail
    }
  });
  assert.strictEqual(completePayment.status, 200);

  const verifyPayment = await request(`/api/payment-details/${reservationId}?email=${encodeURIComponent(testEmail)}`);
  assert.strictEqual(verifyPayment.status, 200);
  assert.strictEqual(verifyPayment.data.payment_status, "Completed");
  console.log("   -> Payment successfully completed and verified. OK");

  // 10. Admin Authentication
  console.log("10. Testing Admin Login and Session...");
  const adminLogin = await request("/api/admin/login", {
    method: "POST",
    body: {
      username: "admin",
      password: "ChangeThisPassword123!"
    }
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.data.message, "Login successful.");
  assert(sessionCookie.includes("haven.sid"));
  console.log("   -> Admin logged in. OK");

  // 11. Admin Dashboard
  console.log("11. Testing GET /api/dashboard...");
  const dashboard = await request("/api/dashboard");
  assert.strictEqual(dashboard.status, 200);
  assert(dashboard.data.rooms >= 4);
  assert(dashboard.data.guests >= 1);
  assert(dashboard.data.reservations >= 1);
  console.log("   -> Dashboard stats:", dashboard.data, "OK");

  // 12. Admin Management Endpoints
  console.log("12. Testing Admin management endpoints...");
  const adminResList = await request("/api/reservations");
  assert.strictEqual(adminResList.status, 200);
  assert(Array.isArray(adminResList.data) && adminResList.data.length >= 1);

  const adminPayList = await request("/api/payments");
  assert.strictEqual(adminPayList.status, 200);
  assert(Array.isArray(adminPayList.data) && adminPayList.data.length >= 1);

  const adminGuestList = await request("/api/guests");
  assert.strictEqual(adminGuestList.status, 200);
  assert(Array.isArray(adminGuestList.data) && adminGuestList.data.length >= 1);

  // 13. Admin Room Management
  const newRoomNum = `999_${Date.now() % 1000}`;
  const addRoom = await request("/api/rooms", {
    method: "POST",
    body: {
      roomNumber: newRoomNum,
      roomType: "Presidential Suite",
      pricePerNight: 8500,
      capacity: 4
    }
  });
  assert.strictEqual(addRoom.status, 201);
  console.log(`   -> Added new room ${newRoomNum}. OK`);

  // 14. Admin Service Management
  const addService = await request("/api/services", {
    method: "POST",
    body: {
      serviceName: `Spa & Massage_${Date.now() % 1000}`,
      description: "Relaxing full body spa session",
      servicePrice: 1500
    }
  });
  assert.strictEqual(addService.status, 201);
  console.log("   -> Added new service. OK");

  // 15. Admin Logout
  console.log("15. Testing Admin Logout...");
  const logout = await request("/api/logout", { method: "POST" });
  assert.strictEqual(logout.status, 200);
  console.log("   -> Logged out successfully. OK");

  // 16. Guest Account Registration
  console.log("16. Testing POST /api/auth/register...");
  const regEmail = `guest_account_${Date.now()}@example.com`;
  const regRes = await request("/api/auth/register", {
    method: "POST",
    body: {
      fullName: "Lady Eleanor",
      email: regEmail,
      phone: "+91 9123456789",
      password: "SecretGuestPassword123!"
    }
  });
  assert.strictEqual(regRes.status, 201);
  assert(regRes.data.user && regRes.data.user.email === regEmail);
  console.log(`   -> Registered guest account: ${regEmail}. OK`);

  // 17. Guest Login Verification
  console.log("17. Testing POST /api/auth/login (Guest & Admin)...");
  const loginRes = await request("/api/auth/login", {
    method: "POST",
    body: {
      email: regEmail,
      password: "SecretGuestPassword123!"
    }
  });
  assert.strictEqual(loginRes.status, 200);
  assert.strictEqual(loginRes.data.isAdmin, false);
  console.log("   -> Guest logged in via email successfully. OK");

  // Phone number login check
  const phoneLoginRes = await request("/api/auth/login", {
    method: "POST",
    body: {
      email: "+91 9123456789",
      password: "SecretGuestPassword123!"
    }
  });
  assert.strictEqual(phoneLoginRes.status, 200);
  console.log("   -> Guest logged in via phone number successfully. OK");

  // Invalid password check
  const badLogin = await request("/api/auth/login", {
    method: "POST",
    body: {
      email: regEmail,
      password: "WrongPassword"
    }
  });
  assert.strictEqual(badLogin.status, 401);
  console.log("   -> Rejected invalid password with 401. OK");

  // Password reset check
  const resetRes = await request("/api/auth/reset-password", {
    method: "POST",
    body: {
      email: regEmail,
      newPassword: "UpdatedPassword123!"
    }
  });
  assert.strictEqual(resetRes.status, 200);
  console.log("   -> Password reset successfully. OK");

  // 18. Guest Session State Check
  console.log("18. Testing GET /api/auth/me...");
  const meRes = await request("/api/auth/me");
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.data.authenticated, true);
  assert.strictEqual(meRes.data.user.email, regEmail);
  console.log(`   -> Active session confirmed for ${meRes.data.user.name}. OK`);

  // 19. Authenticated My Bookings API
  console.log("19. Testing GET /api/my-bookings for logged-in guest...");
  const myBookingsList = await request("/api/my-bookings");
  assert.strictEqual(myBookingsList.status, 200);
  assert(Array.isArray(myBookingsList.data));
  console.log(`   -> Retrieved user booking history (${myBookingsList.data.length} found). OK`);

  // 20. Guest Sign Out
  console.log("20. Testing POST /api/auth/logout...");
  const authLogout = await request("/api/auth/logout", { method: "POST" });
  assert.strictEqual(authLogout.status, 200);
  console.log("   -> Guest logged out successfully. OK");

  console.log("\nALL TESTS PASSED SUCCESSFULLY! The MongoDB Node.js backend & Authentication are 100% operational!");
}

module.exports = { runTests };

if (require.main === module) {
  runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
