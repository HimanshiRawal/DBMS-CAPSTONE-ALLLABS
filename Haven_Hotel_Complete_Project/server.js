require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");

const { connectDB } = require("./config/db");
const {
  Room,
  Guest,
  Reservation,
  Payment,
  Service,
  getNextSequence
} = require("./models");
const { seedDatabase } = require("./database/seed");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const PUBLIC_DIR = path.join(__dirname, "public");
const ADMIN_DIR = path.join(__dirname, "admin");

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "haven.sid",
    secret: process.env.SESSION_SECRET || "change-this-secret-before-deployment",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.status(401).json({
    message: "Please log in as an administrator."
  });
}

function safeEqual(a, b) {
  const first = Buffer.from(String(a || ""));
  const second = Buffer.from(String(b || ""));

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}

function validDateRange(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(checkIn || "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOut || "") &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end > start
  );
}

function nightsBetween(checkIn, checkOut) {
  return Math.round(
    (new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`)) / 86400000
  );
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// ==========================================
// CUSTOMER WEBSITE STATIC ROUTES
// ==========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"), (err) => {
    if (err && !res.headersSent) {
      res.status(404).send(
        "Customer homepage not found. Please check public/index.html."
      );
    }
  });
});

app.use(express.static(PUBLIC_DIR));

// ==========================================
// AUTHENTICATION PAGES (GUEST & STAFF)
// ==========================================

app.get("/auth", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "auth.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "auth.html"));
});

// ==========================================
// ADMIN WEBSITE STATIC ROUTES
// ==========================================

app.get("/admin-login", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect("/admin");
  }

  res.sendFile(path.join(PUBLIC_DIR, "admin-login.html"));
});

app.get("/admin-login.css", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin-login.css"));
});

app.get("/admin-login.js", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin-login.js"));
});

app.get("/admin", (req, res) => {
  if (!req.session || req.session.isAdmin !== true) {
    return res.redirect("/admin-login");
  }

  res.sendFile(path.join(ADMIN_DIR, "index.html"));
});

app.get("/admin/admin.css", requireAdmin, (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.css"));
});

app.get("/admin/admin.js", requireAdmin, (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.js"));
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Hotel Woodland Deluxe",
    database: "MongoDB"
  });
});

// ==========================================
// QR CODE DEMO
// ==========================================

app.get(
  "/api/demo-qr",
  asyncRoute(async (req, res) => {
    const qrDataUrl = await QRCode.toDataURL(
      "HOTEL WOODLAND DELUXE - DEMO ONLY - NO REAL PAYMENT",
      {
        width: 220,
        margin: 2
      }
    );

    res.json({ qrDataUrl });
  })
);

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

app.post(
  "/api/admin/login",
  asyncRoute(async (req, res) => {
    const { username, password } = req.body;

    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedPassword =
      process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";

    const inputUser = String(username || "").trim();

    if (
      (!safeEqual(inputUser.toLowerCase(), expectedUser.toLowerCase()) &&
        !safeEqual(inputUser.toLowerCase(), "admin@havenhotel.in")) ||
      !safeEqual(password, expectedPassword)
    ) {
      return res.status(401).json({
        message: "Incorrect username or password."
      });
    }

    req.session.isAdmin = true;
    req.session.adminUsername = expectedUser;
    req.session.isLoggedIn = true;
    req.session.userRole = "admin";
    req.session.userName = "Administrator";
    req.session.userEmail = "admin@havenhotel.in";

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          message: "Could not start admin session."
        });
      }

      res.json({
        message: "Login successful.",
        redirect: "/admin",
        user: {
          name: expectedUser,
          email: "admin@havenhotel.in",
          role: "admin"
        }
      });
    });
  })
);

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("haven.sid");
    res.json({ message: "Logged out." });
  });
});

// ==========================================
// UNIFIED GUEST & ADMIN AUTHENTICATION
// ==========================================

app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        message: "Please provide your full name, email, phone and a password."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await Guest.findOne({ email: normalizedEmail });

    if (existing && existing.password) {
      return res.status(409).json({
        message: "An account with this email address already exists. Please sign in."
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    let guest = existing;

    if (guest) {
      guest.full_name = String(fullName).trim();
      guest.phone = String(phone).trim();
      guest.password = hashedPassword;
      await guest.save();
    } else {
      const nextGuestId = await getNextSequence("guest_id");
      guest = await Guest.create({
        guest_id: nextGuestId,
        full_name: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim(),
        password: hashedPassword,
        role: "guest"
      });
    }

    req.session.userId = guest.guest_id;
    req.session.userEmail = guest.email;
    req.session.userName = guest.full_name;
    req.session.userPhone = guest.phone;
    req.session.isLoggedIn = true;
    req.session.userRole = "guest";

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          message: "Could not establish user session."
        });
      }

      res.status(201).json({
        message: "Account created successfully.",
        user: {
          id: guest.guest_id,
          name: guest.full_name,
          email: guest.email,
          phone: guest.phone,
          role: "guest"
        }
      });
    });
  })
);

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter your email or phone number and password."
      });
    }

    const inputUser = String(email).trim();
    const expectedAdmin = process.env.ADMIN_USERNAME || "admin";
    const expectedAdminPass = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";

    // Check if logging in with Admin credentials
    if (
      (safeEqual(inputUser.toLowerCase(), expectedAdmin.toLowerCase()) ||
        safeEqual(inputUser.toLowerCase(), "admin@havenhotel.in")) &&
      safeEqual(password, expectedAdminPass)
    ) {
      req.session.isAdmin = true;
      req.session.adminUsername = expectedAdmin;
      req.session.isLoggedIn = true;
      req.session.userRole = "admin";
      req.session.userName = "Administrator";
      req.session.userEmail = "admin@havenhotel.in";

      return req.session.save((err) => {
        if (err) {
          return res.status(500).json({
            message: "Could not establish administrator session."
          });
        }

        res.json({
          message: "Welcome, Administrator.",
          isAdmin: true,
          redirect: "/admin",
          user: {
            name: expectedAdmin,
            email: "admin@havenhotel.in",
            role: "admin"
          }
        });
      });
    }

    // Check guest account in MongoDB by email or phone
    const normalizedEmail = inputUser.toLowerCase();
    const cleanPhone = inputUser.replace(/[\s\-\(\)]/g, "");

    const guest = await Guest.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: inputUser },
        { phone: cleanPhone }
      ]
    });

    if (!guest) {
      return res.status(401).json({
        message: "No account found with this email or phone. Please create an account."
      });
    }

    if (!guest.password) {
      return res.status(401).json({
        message: "You have an active booking profile, but no password has been set yet. Please use the 'Create Account' tab to set your password."
      });
    }

    const passwordMatch = await bcrypt.compare(String(password), guest.password);
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Incorrect password. Please verify your credentials or reset your password."
      });
    }

    req.session.userId = guest.guest_id;
    req.session.userEmail = guest.email;
    req.session.userName = guest.full_name;
    req.session.userPhone = guest.phone;
    req.session.isLoggedIn = true;
    req.session.userRole = "guest";

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          message: "Could not establish user session."
        });
      }

      res.json({
        message: `Welcome back, ${guest.full_name.split(" ")[0]}.`,
        isAdmin: false,
        redirect: "/",
        user: {
          id: guest.guest_id,
          name: guest.full_name,
          email: guest.email,
          phone: guest.phone,
          role: "guest"
        }
      });
    });
  })
);

app.post(
  "/api/auth/reset-password",
  asyncRoute(async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        message: "Please enter your registered email address and new password."
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(email).trim().replace(/[\s\-\(\)]/g, "");

    const guest = await Guest.findOne({
      $or: [
        { email: normalizedEmail },
        { phone: String(email).trim() },
        { phone: cleanPhone }
      ]
    });

    if (!guest) {
      return res.status(404).json({
        message: "No registered account found with that email or phone number."
      });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    guest.password = hashedPassword;
    await guest.save();

    req.session.userId = guest.guest_id;
    req.session.userEmail = guest.email;
    req.session.userName = guest.full_name;
    req.session.userPhone = guest.phone;
    req.session.isLoggedIn = true;
    req.session.userRole = "guest";

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          message: "Password updated, but session could not be established."
        });
      }

      res.json({
        message: "Password updated successfully. You are now signed in.",
        redirect: "/",
        user: {
          id: guest.guest_id,
          name: guest.full_name,
          email: guest.email,
          phone: guest.phone,
          role: "guest"
        }
      });
    });
  })
);

app.get("/api/auth/me", (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({
      authenticated: true,
      isAdmin: true,
      user: {
        name: req.session.adminUsername || "Administrator",
        email: "admin@havenhotel.in",
        role: "admin"
      }
    });
  }

  if (req.session && req.session.isLoggedIn && req.session.userEmail) {
    return res.json({
      authenticated: true,
      isAdmin: false,
      user: {
        id: req.session.userId,
        name: req.session.userName,
        email: req.session.userEmail,
        phone: req.session.userPhone,
        role: "guest"
      }
    });
  }

  res.json({
    authenticated: false
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("haven.sid");
    res.json({ message: "Logged out successfully." });
  });
});

// ==========================================
// MY BOOKINGS (AUTHENTICATED USER DOSSIER)
// ==========================================

app.get(
  "/api/my-bookings",
  asyncRoute(async (req, res) => {
    if (!req.session || !req.session.userEmail) {
      return res.status(401).json({
        message: "Please sign in to view your bookings."
      });
    }

    const guest = await Guest.findOne({ email: req.session.userEmail });
    if (!guest) {
      return res.json([]);
    }

    const reservations = await Reservation.find({
      guest_id: guest.guest_id
    }).sort({ reservation_id: -1 });

    const roomIds = reservations.map((r) => r.room_id);
    const reservationIds = reservations.map((r) => r.reservation_id);

    const [rooms, payments] = await Promise.all([
      Room.find({ room_id: { $in: roomIds } }),
      Payment.find({ reservation_id: { $in: reservationIds } })
    ]);

    const roomMap = new Map(rooms.map((rm) => [rm.room_id, rm]));
    const paymentMap = new Map(payments.map((p) => [p.reservation_id, p]));

    const result = reservations.map((r) => {
      const rm = roomMap.get(r.room_id);
      const p = paymentMap.get(r.reservation_id);

      return {
        reservation_id: r.reservation_id,
        check_in: r.check_in,
        check_out: r.check_out,
        booking_date: r.booking_date,
        booking_status: r.booking_status,
        full_name: guest.full_name,
        email: guest.email,
        room_number: rm ? rm.room_number : "—",
        room_type: rm ? rm.room_type : "Suite",
        price_per_night: rm ? rm.price_per_night : 0,
        amount: p ? p.amount : 0,
        payment_method: p ? p.payment_method : "UPI",
        payment_status: p ? p.payment_status : "Pending"
      };
    });

    res.json(result);
  })
);

// ==========================================
// ROOMS (PUBLIC)
// ==========================================

app.get(
  "/api/rooms",
  asyncRoute(async (req, res) => {
    const rooms = await Room.find().sort({ room_number: 1 });

    const formatted = rooms.map((room) => ({
      RoomID: room.room_id,
      RoomNumber: room.room_number,
      RoomType: room.room_type,
      PricePerNight: room.price_per_night,
      Capacity: room.capacity,
      Status: room.room_status
    }));

    res.json(formatted);
  })
);

// ==========================================
// SERVICES (PUBLIC)
// ==========================================

app.get(
  "/api/services",
  asyncRoute(async (req, res) => {
    const services = await Service.find().sort({ service_id: 1 });

    const formatted = services.map((service) => ({
      ServiceID: service.service_id,
      ServiceName: service.service_name,
      Description: service.description,
      Price: service.service_price
    }));

    res.json(formatted);
  })
);

// ==========================================
// AVAILABLE ROOMS (DATE & CAPACITY FILTER)
// ==========================================

app.get(
  "/api/rooms/available",
  asyncRoute(async (req, res) => {
    const { checkIn, checkOut, guests } = req.query;
    const guestCount = Number(guests || 1);

    if (
      !validDateRange(checkIn, checkOut) ||
      !Number.isInteger(guestCount) ||
      guestCount < 1
    ) {
      return res.status(400).json({
        message: "Enter valid check-in, check-out and guest details."
      });
    }

    // Find any room that has an overlapping active reservation
    const overlappingReservations = await Reservation.find({
      booking_status: { $nin: ["Cancelled", "Checked Out"] },
      check_in: { $lt: checkOut },
      check_out: { $gt: checkIn }
    }).select("room_id");

    const reservedRoomIds = overlappingReservations.map((r) => r.room_id);

    const availableRooms = await Room.find({
      room_status: "Available",
      capacity: { $gte: guestCount },
      room_id: { $nin: reservedRoomIds }
    }).sort({ room_number: 1 });

    const formatted = availableRooms.map((rm) => ({
      room_id: rm.room_id,
      room_number: rm.room_number,
      room_type: rm.room_type,
      price_per_night: rm.price_per_night,
      capacity: rm.capacity
    }));

    res.json(formatted);
  })
);

// ==========================================
// CREATE RESERVATION
// ==========================================

app.post(
  "/api/reservations",
  asyncRoute(async (req, res) => {
    const {
      fullName,
      email,
      phone,
      roomId,
      checkIn,
      checkOut,
      guests
    } = req.body;

    const guestCount = Number(guests);
    const numericRoomId = Number(roomId);

    if (
      !fullName ||
      !email ||
      !phone ||
      !roomId ||
      !validDateRange(checkIn, checkOut) ||
      !Number.isInteger(guestCount) ||
      guestCount < 1
    ) {
      return res.status(400).json({
        message: "Please complete all booking details correctly."
      });
    }

    // Verify room exists and is currently Available
    const room = await Room.findOne({
      room_id: numericRoomId,
      room_status: "Available"
    });

    if (!room) {
      return res.status(409).json({
        message: "This room is not currently available."
      });
    }

    if (Number(room.capacity) < guestCount) {
      return res.status(400).json({
        message: "The selected room cannot accommodate that many guests."
      });
    }

    // Check for double booking / overlapping dates
    const overlap = await Reservation.findOne({
      room_id: numericRoomId,
      booking_status: { $nin: ["Cancelled", "Checked Out"] },
      check_in: { $lt: checkOut },
      check_out: { $gt: checkIn }
    });

    if (overlap) {
      return res.status(409).json({
        message: "Sorry, this room has just been booked for those dates."
      });
    }

    // Find or create/update guest by email
    const normalizedEmail = String(email).trim().toLowerCase();
    let guest = await Guest.findOne({ email: normalizedEmail });

    if (guest) {
      guest.full_name = String(fullName).trim();
      guest.phone = String(phone).trim();
      await guest.save();
    } else {
      const nextGuestId = await getNextSequence("guest_id");
      guest = await Guest.create({
        guest_id: nextGuestId,
        full_name: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone).trim()
      });
    }

    const nights = nightsBetween(checkIn, checkOut);
    const totalAmount = Number(room.price_per_night) * nights;

    // Create reservation
    const nextReservationId = await getNextSequence("reservation_id");
    const reservation = await Reservation.create({
      reservation_id: nextReservationId,
      guest_id: guest.guest_id,
      room_id: room.room_id,
      check_in: checkIn,
      check_out: checkOut,
      booking_status: "Confirmed"
    });

    // Create initial pending payment
    const nextPaymentId = await getNextSequence("payment_id");
    await Payment.create({
      payment_id: nextPaymentId,
      reservation_id: reservation.reservation_id,
      amount: totalAmount,
      payment_method: "UPI",
      payment_status: "Pending",
      payment_date: new Date()
    });

    res.status(201).json({
      message: "Room reserved. Continue to the demo payment page.",
      reservationId: reservation.reservation_id,
      totalAmount,
      nights
    });
  })
);

// ==========================================
// CUSTOMER BOOKING DETAILS
// ==========================================

app.get(
  "/api/my-booking/:id",
  asyncRoute(async (req, res) => {
    const email = String(req.query.email || "").trim().toLowerCase();
    const reservationId = Number(req.params.id);

    const reservation = await Reservation.findOne({
      reservation_id: reservationId
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Booking not found. Check the reservation ID and email."
      });
    }

    const guest = await Guest.findOne({
      guest_id: reservation.guest_id,
      email: email
    });

    if (!guest) {
      return res.status(404).json({
        message: "Booking not found. Check the reservation ID and email."
      });
    }

    const room = await Room.findOne({ room_id: reservation.room_id });
    const payment = await Payment.findOne({
      reservation_id: reservation.reservation_id
    });

    res.json({
      reservation_id: reservation.reservation_id,
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      booking_date: reservation.booking_date,
      booking_status: reservation.booking_status,
      full_name: guest.full_name,
      email: guest.email,
      room_number: room ? room.room_number : "N/A",
      room_type: room ? room.room_type : "N/A",
      price_per_night: room ? room.price_per_night : 0,
      amount: payment ? payment.amount : 0,
      payment_method: payment ? payment.payment_method : "UPI",
      payment_status: payment ? payment.payment_status : "Pending"
    });
  })
);

// ==========================================
// CANCEL BOOKING
// ==========================================

app.patch(
  "/api/my-booking/:id/cancel",
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const reservationId = Number(req.params.id);

    const reservation = await Reservation.findOne({
      reservation_id: reservationId
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Booking not found."
      });
    }

    const guest = await Guest.findOne({
      guest_id: reservation.guest_id,
      email: email
    });

    if (!guest) {
      return res.status(404).json({
        message: "Booking not found."
      });
    }

    if (reservation.booking_status !== "Confirmed") {
      return res.status(400).json({
        message: "Only confirmed bookings can be cancelled."
      });
    }

    reservation.booking_status = "Cancelled";
    await reservation.save();

    res.json({
      message:
        "Booking cancelled. If a payment was made, contact the hotel about its refund policy."
    });
  })
);

// ==========================================
// PAYMENT DETAILS
// ==========================================

app.get(
  "/api/payment-details/:id",
  asyncRoute(async (req, res) => {
    const email = String(req.query.email || "").trim().toLowerCase();
    const reservationId = Number(req.params.id);

    const reservation = await Reservation.findOne({
      reservation_id: reservationId
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Payment details not found."
      });
    }

    const guest = await Guest.findOne({
      guest_id: reservation.guest_id,
      email: email
    });

    if (!guest) {
      return res.status(404).json({
        message: "Payment details not found."
      });
    }

    const room = await Room.findOne({ room_id: reservation.room_id });
    const payment = await Payment.findOne({
      reservation_id: reservation.reservation_id
    });

    res.json({
      reservation_id: reservation.reservation_id,
      booking_status: reservation.booking_status,
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      full_name: guest.full_name,
      email: guest.email,
      room_number: room ? room.room_number : "N/A",
      room_type: room ? room.room_type : "N/A",
      amount: payment ? payment.amount : 0,
      payment_method: payment ? payment.payment_method : "UPI",
      payment_status: payment ? payment.payment_status : "Pending"
    });
  })
);

// ==========================================
// SAVE CUSTOMER PAYMENT METHOD
// ==========================================

app.post(
  "/api/payment-method/:id",
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const paymentMethod = req.body.paymentMethod;
    const reservationId = Number(req.params.id);

    if (!["Cash", "Card", "UPI"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Please select Cash, Card or UPI."
      });
    }

    const reservation = await Reservation.findOne({
      reservation_id: reservationId
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Payment record not found or payment is already completed."
      });
    }

    const guest = await Guest.findOne({
      guest_id: reservation.guest_id,
      email: email
    });

    if (!guest) {
      return res.status(404).json({
        message: "Payment record not found or payment is already completed."
      });
    }

    const payment = await Payment.findOne({
      reservation_id: reservation.reservation_id
    });

    if (!payment || payment.payment_status !== "Pending") {
      return res.status(404).json({
        message: "Payment record not found or payment is already completed."
      });
    }

    payment.payment_method = paymentMethod;
    await payment.save();

    res.json({
      message: "Payment method saved successfully.",
      paymentMethod
    });
  })
);

// ==========================================
// DEMO PAYMENT
// ==========================================

app.post(
  "/api/payment-demo/:id",
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const reservationId = Number(req.params.id);

    const reservation = await Reservation.findOne({
      reservation_id: reservationId
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Payment record not found."
      });
    }

    const guest = await Guest.findOne({
      guest_id: reservation.guest_id,
      email: email
    });

    if (!guest) {
      return res.status(404).json({
        message: "Payment record not found."
      });
    }

    const payment = await Payment.findOne({
      reservation_id: reservation.reservation_id
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment record not found."
      });
    }

    if (payment.payment_status === "Completed" || payment.payment_status === "Paid") {
      return res.json({
        message: "This payment has already been completed."
      });
    }

    if (!["UPI", "Card"].includes(payment.payment_method)) {
      return res.status(400).json({
        message: "Only UPI and Card demo payments can be completed online."
      });
    }

    payment.payment_status = "Completed";
    payment.payment_date = new Date();
    await payment.save();

    res.json({
      message:
        "Demo payment completed successfully. No real money was transferred."
    });
  })
);

// ==========================================
// ADMIN DASHBOARD
// ==========================================

app.get(
  "/api/dashboard",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const [roomsCount, guestsCount, reservationsCount, pendingPaymentsCount] =
      await Promise.all([
        Room.countDocuments(),
        Guest.countDocuments(),
        Reservation.countDocuments(),
        Payment.countDocuments({ payment_status: "Pending" })
      ]);

    res.json({
      rooms: roomsCount,
      guests: guestsCount,
      reservations: reservationsCount,
      pendingPayments: pendingPaymentsCount
    });
  })
);

// ==========================================
// ADMIN RESERVATIONS
// ==========================================

app.get(
  "/api/reservations",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const reservations = await Reservation.find().sort({ reservation_id: -1 });

    const guestIds = reservations.map((r) => r.guest_id);
    const roomIds = reservations.map((r) => r.room_id);
    const reservationIds = reservations.map((r) => r.reservation_id);

    const [guests, rooms, payments] = await Promise.all([
      Guest.find({ guest_id: { $in: guestIds } }),
      Room.find({ room_id: { $in: roomIds } }),
      Payment.find({ reservation_id: { $in: reservationIds } })
    ]);

    const guestMap = new Map(guests.map((g) => [g.guest_id, g]));
    const roomMap = new Map(rooms.map((rm) => [rm.room_id, rm]));
    const paymentMap = new Map(payments.map((p) => [p.reservation_id, p]));

    const formatted = reservations.map((r) => {
      const g = guestMap.get(r.guest_id);
      const rm = roomMap.get(r.room_id);
      const p = paymentMap.get(r.reservation_id);

      return {
        ReservationID: r.reservation_id,
        GuestName: g ? g.full_name : "Unknown",
        Email: g ? g.email : "",
        Phone: g ? g.phone : "",
        RoomNumber: rm ? rm.room_number : "",
        RoomType: rm ? rm.room_type : "",
        CheckIn: r.check_in,
        CheckOut: r.check_out,
        BookingStatus: r.booking_status,
        Amount: p ? p.amount : 0,
        PaymentStatus: p ? p.payment_status : "Pending"
      };
    });

    res.json(formatted);
  })
);

// ==========================================
// ADMIN PAYMENTS
// ==========================================

app.get(
  "/api/payments",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const payments = await Payment.find().sort({ payment_id: -1 });
    const reservationIds = payments.map((p) => p.reservation_id);

    const reservations = await Reservation.find({
      reservation_id: { $in: reservationIds }
    });
    const guestIds = reservations.map((r) => r.guest_id);
    const guests = await Guest.find({ guest_id: { $in: guestIds } });

    const resMap = new Map(reservations.map((r) => [r.reservation_id, r]));
    const guestMap = new Map(guests.map((g) => [g.guest_id, g]));

    const formatted = payments.map((p) => {
      const res = resMap.get(p.reservation_id);
      const g = res ? guestMap.get(res.guest_id) : null;

      let paymentDateStr = "";
      if (p.payment_date) {
        try {
          paymentDateStr = new Date(p.payment_date).toISOString().slice(0, 10);
        } catch (_) {
          paymentDateStr = String(p.payment_date);
        }
      }

      return {
        PaymentID: p.payment_id,
        ReservationID: p.reservation_id,
        GuestName: g ? g.full_name : "Unknown",
        Email: g ? g.email : "",
        Amount: p.amount,
        PaymentDate: paymentDateStr,
        PaymentMethod: p.payment_method,
        PaymentStatus: p.payment_status
      };
    });

    res.json(formatted);
  })
);

// ==========================================
// ADMIN GUESTS
// ==========================================

app.get(
  "/api/guests",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const guests = await Guest.find().sort({ guest_id: -1 });

    const formatted = guests.map((g) => ({
      GuestID: g.guest_id,
      FullName: g.full_name,
      Email: g.email,
      Phone: g.phone
    }));

    res.json(formatted);
  })
);

// ==========================================
// ADMIN ROOM MANAGEMENT
// ==========================================

app.post(
  "/api/rooms",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { roomNumber, roomType, pricePerNight, capacity } = req.body;

    if (
      !roomNumber ||
      !roomType ||
      !Number.isFinite(Number(pricePerNight)) ||
      Number(pricePerNight) < 0 ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) < 1
    ) {
      return res.status(400).json({
        message: "Enter valid room details."
      });
    }

    const existingRoom = await Room.findOne({
      room_number: String(roomNumber).trim()
    });
    if (existingRoom) {
      return res.status(409).json({
        message: "That room number already exists."
      });
    }

    const nextRoomId = await getNextSequence("room_id");

    await Room.create({
      room_id: nextRoomId,
      room_number: String(roomNumber).trim(),
      room_type: String(roomType).trim(),
      price_per_night: Number(pricePerNight),
      capacity: Number(capacity),
      room_status: "Available"
    });

    res.status(201).json({
      message: "Room added."
    });
  })
);

app.patch(
  "/api/rooms/:id/status",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status } = req.body;
    const roomId = Number(req.params.id);

    if (!["Available", "Maintenance", "Unavailable"].includes(status)) {
      return res.status(400).json({
        message: "Invalid room status."
      });
    }

    const room = await Room.findOneAndUpdate(
      { room_id: roomId },
      { room_status: status },
      { returnDocument: "after" }
    );

    if (!room) {
      return res.status(404).json({
        message: "Room not found."
      });
    }

    res.json({
      message: "Room status updated."
    });
  })
);

// ==========================================
// ADMIN SERVICE MANAGEMENT
// ==========================================

app.post(
  "/api/services",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { serviceName, description, servicePrice } = req.body;

    if (
      !serviceName ||
      !Number.isFinite(Number(servicePrice)) ||
      Number(servicePrice) < 0
    ) {
      return res.status(400).json({
        message: "Enter valid service details."
      });
    }

    const nextServiceId = await getNextSequence("service_id");

    await Service.create({
      service_id: nextServiceId,
      service_name: String(serviceName).trim(),
      description: String(description || "").trim(),
      service_price: Number(servicePrice)
    });

    res.status(201).json({
      message: "Service added."
    });
  })
);

// ==========================================
// ADMIN RESERVATION MANAGEMENT
// ==========================================

app.patch(
  "/api/reservations/:id/status",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status } = req.body;
    const reservationId = Number(req.params.id);

    if (
      !["Confirmed", "Cancelled", "Checked In", "Checked Out"].includes(status)
    ) {
      return res.status(400).json({
        message: "Invalid booking status."
      });
    }

    const reservation = await Reservation.findOneAndUpdate(
      { reservation_id: reservationId },
      { booking_status: status },
      { returnDocument: "after" }
    );

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found."
      });
    }

    res.json({
      message: "Reservation status updated."
    });
  })
);

// ==========================================
// ADMIN PAYMENT MANAGEMENT
// ==========================================

app.patch(
  "/api/payments/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const { status } = req.body;
    const paymentId = Number(req.params.id);

    // Support 'Paid' as well as 'Completed' since admin UI dropdown has 'Paid'
    if (!["Pending", "Completed", "Paid", "Refunded"].includes(status)) {
      return res.status(400).json({
        message: "Invalid payment status."
      });
    }

    const updateFields = { payment_status: status };
    if (status === "Completed" || status === "Paid") {
      updateFields.payment_date = new Date();
    }

    const payment = await Payment.findOneAndUpdate(
      { payment_id: paymentId },
      updateFields,
      { returnDocument: "after" }
    );

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found."
      });
    }

    res.json({
      message: "Payment status updated."
    });
  })
);

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
  console.error("Server Error:", error);

  if (error && (error.code === 11000 || error.code === "ER_DUP_ENTRY")) {
    return res.status(409).json({
      message: "That room number or email already exists."
    });
  }

  res.status(500).json({
    message: "Something went wrong on the server. Check the terminal for details."
  });
});

// ==========================================
// 404 CATCH-ALL
// ==========================================

app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// ==========================================
// START SERVER
// ==========================================

async function start() {
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully.");

    // Auto-seed initial rooms and services if not present
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Haven Hotel Management System running at http://localhost:${PORT}`);
      console.log(`Customer website: http://localhost:${PORT}/`);
      console.log(`Admin login:      http://localhost:${PORT}/admin-login`);
    });
  } catch (error) {
    console.error(
      "Could not connect to MongoDB. Check your MONGODB_URI in .env and make sure MongoDB is running.",
      error.message
    );
    process.exit(1);
  }
}

start();
