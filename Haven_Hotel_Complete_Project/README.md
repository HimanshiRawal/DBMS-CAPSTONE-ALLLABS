# Haven Hotel Management System (Node.js & MongoDB)

A full-stack hotel management and room reservation system built using **HTML5, CSS3, JavaScript, Node.js, Express, and MongoDB (via Mongoose)**.

---

##  Key Features

###  Customer Website & Guest Portal
- **Unified Authentication**: Dedicated luxury guest & staff authentication page (`/auth` or `/login`) with dual tabs for **Sign In** and **Create Account**.
- **Secure Password Hashing**: Utilizes `bcryptjs` with salt rounds to protect guest credentials in MongoDB.
- **Session-Aware Booking**: Automatically recognizes logged-in guests, pre-fills their details, and provides quick navigation to their active reservations.
- **Guest Reservation Dossier (`/api/my-bookings`)**: Automatically retrieves all active and historical bookings for logged-in guests.
- **Browse Rooms & Services**: View all available room types, pricing, capacity, and amenities.
- **Real-Time Date-wise Availability**: Select check-in and check-out dates and guest count to filter rooms that are currently free (with automated double-booking prevention).
- **Direct Reservation**: Book a room with guest details (name, email, phone).
- **Simulated Payment Flow**: Demo UPI QR code generation, Credit/Debit card validation, and Pay-at-Hotel Cash option.
- **My Booking Lookup**: Search reservations by Reservation ID and registered email.
- **Instant Booking Cancellation**: Cancel active bookings directly from the portal.

###  Protected Admin Dashboard
- **Secure Admin Authentication**: Session-backed login with timing-safe credential verification.
- **Live Statistics Overview**: Total rooms, registered guests, reservations count, and pending payments count.
- **Reservation Management**: Filter and change booking status (`Confirmed`, `Checked In`, `Checked Out`, `Cancelled`).
- **Room Management**: Add new rooms and update maintenance/availability status (`Available`, `Maintenance`, `Unavailable`).
- **Service Management**: Add custom hotel amenities and set prices.
- **Payment Auditing**: Review payment history, payment method, and update payment status (`Pending`, `Paid`, `Refunded`).
- **Guest Registry**: View all customer contact records.

---

##  Project Architecture

```text
Haven_Hotel_Complete_Project/
├── config/
│   └── db.js                 # MongoDB connection handler & events
├── models/
│   ├── Counter.js            # Atomic sequence generator for clean numeric IDs
│   ├── Room.js               # Room schema & indexing
│   ├── Guest.js              # Guest schema & unique email index
│   ├── Reservation.js        # Reservation schema & date overlap index
│   ├── Payment.js            # Payment tracking schema
│   ├── Service.js            # Hotel services schema
│   └── index.js              # Barrel export for all models
├── database/
│   ├── seed.js               # Standalone database seeding script
│   └── hotel_management.sql  # Legacy SQL backup
├── admin/
│   ├── index.html            # Admin dashboard UI
│   ├── admin.css             # Admin dashboard styling
│   └── admin.js              # Admin interactions & API fetch calls
├── public/
│   ├── index.html            # Main customer booking homepage
│   ├── customer.html         # Alternate customer layout
│   ├── customer.css          # Customer UI styles
│   ├── customer.js           # Customer booking & availability logic
│   ├── payment.html          # Interactive payment portal (UPI / Card / Cash)
│   ├── admin-login.html      # Admin login page
│   ├── admin-login.css       # Admin login styles
│   └── admin-login.js        # Admin login submit handler
├── .env                      # Environment variables (PORT, MONGODB_URI, etc.)
├── .env.example              # Environment variables template
├── package.json              # Project scripts & dependencies
├── server.js                 # Express server with REST APIs
└── README.md                 # Project documentation
```

---

##  MongoDB Data Models

1. **Room (`rooms`)**:
   - `room_id`: Numeric unique identifier (e.g. 1, 2, 3...)
   - `room_number`: String (e.g. "101", "102", "201", "202")
   - `room_type`: String (e.g. "Deluxe AC", "Family Room")
   - `price_per_night`: Number
   - `capacity`: Number of guests
   - `room_status`: 'Available' | 'Maintenance' | 'Unavailable'

2. **Guest (`guests`)**:
   - `guest_id`: Numeric unique identifier
   - `full_name`: Guest name
   - `email`: Normalized unique lowercase email
   - `phone`: Contact phone number

3. **Reservation (`reservations`)**:
   - `reservation_id`: Numeric booking confirmation number
   - `guest_id`: Referenced guest identifier
   - `room_id`: Referenced room identifier
   - `check_in`: YYYY-MM-DD
   - `check_out`: YYYY-MM-DD
   - `booking_date`: Timestamp
   - `booking_status`: 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled'

4. **Payment (`payments`)**:
   - `payment_id`: Numeric payment transaction ID
   - `reservation_id`: Associated reservation
   - `amount`: Total amount in INR
   - `payment_method`: 'UPI' | 'Card' | 'Cash' | 'Demo UPI'
   - `payment_status`: 'Pending' | 'Completed' | 'Paid' | 'Refunded'
   - `payment_date`: Timestamp

5. **Service (`services`)**:
   - `service_id`: Numeric service identifier
   - `service_name`: Name of service
   - `description`: Service description
   - `service_price`: Price in INR

6. **Counter (`counters`)**:
   - Atomic sequence counter ensuring backwards-compatible numeric IDs.

---

##  Getting Started

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **MongoDB**: Local MongoDB instance running (`brew services start mongodb-community`) or a cloud MongoDB Atlas connection URI.

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Environment Configuration
Check `.env` (already created with default local settings):
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/HotelManagement
SESSION_SECRET=haven-hotel-secret-key-production-ready
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisPassword123!
```

> **Note for MongoDB Atlas**:
> Replace `MONGODB_URI` with your connection string:
> `mongodb+srv://<username>:<password>@cluster0.mongodb.net/HotelManagement?retryWrites=true&w=majority`

### 3. Database Seeding (Optional)
The server **automatically seeds initial rooms and services** on first startup. You can also seed manually anytime:
```bash
npm run seed
```

### 4. Running the Server
Start the production server:
```bash
npm start
```
Or start in development mode with auto-reload:
```bash
npm run dev
```

### 5. Access the Application
- **Customer Booking Website**: [http://localhost:3000/](http://localhost:3000/)
- **Admin Portal**: [http://localhost:3000/admin-login](http://localhost:3000/admin-login)
  - Default Username: `admin`
  - Default Password: `ChangeThisPassword123!`

---

##  Testing the Booking Workflow

1. Open [http://localhost:3000/](http://localhost:3000/).
2. Select Check-In and Check-Out dates (e.g., today and tomorrow).
3. Select Guests and click **Check Availability**.
4. Choose an available room, enter Guest Name, Email, and Phone, then click **Book / Continue to Payment**.
5. On the Payment page, select **UPI**, **Card**, or **Cash**, and complete the simulated payment.
6. Verify your booking using the **My Booking** section with your Reservation ID and email.
7. Log into the Admin Dashboard at `/admin-login` to inspect the new reservation, guest record, and payment status.

---

##  Suggested Viva / Presentation Explanation

> *"Haven Hotel is a full-stack hotel management web application built with Node.js, Express, and MongoDB using Mongoose ODM. It features a public-facing customer portal and a protected administrative dashboard. The customer portal allows guests to view accommodations, check live date-wise room availability with overlap protection, create reservations, and complete simulated payments. The admin dashboard provides real-time business metrics, room and service management, and reservation lifecycle tracking. MongoDB stores the documents with indexes on search keys, and atomic counters are used for human-readable reservation numbers."*
