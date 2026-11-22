# DBMS Capstone Portfolio & Haven Hotel Management System

A full-stack Hotel Management & Room Reservation Web Application built with **Node.js, Express, MongoDB (via Mongoose), HTML5, CSS3, and JavaScript**, alongside academic DBMS lab submissions.

**Author:** [Himanshi Rawal](https://github.com/HimanshiRawal)  
**Repository:** [HimanshiRawal/DBMS-CAPSTONE-ALLLABS](https://github.com/HimanshiRawal/DBMS-CAPSTONE-ALLLABS)

---

##  Haven Hotel Management System Overview

Haven Hotel is an end-to-end hotel operations and reservation platform featuring both a customer-facing booking portal and a secure administrative management dashboard.

###  Customer Website & Guest Portal
- **Guest Authentication**: Sign in and registration with password hashing (`bcryptjs`) at `/auth`.
- **Suite Showcase**: Real-time room viewing across Standard Non-AC, Standard AC, Deluxe AC, and Family Room categories.
- **Date-Wise Availability**: Dynamic check-in and check-out date filtering with automated double-booking prevention.
- **Direct Reservation**: Instant booking workflow with guest contact details.
- **Simulated Payment Gateway**: Dynamic UPI QR code generation, Credit/Debit card validation, and Cash on Arrival options.
- **Reservation Lookup**: Lookup, verify, and cancel active bookings using Reservation ID and registered email.

###  Protected Administrative Dashboard
- **Role-Based Access**: Session-backed admin authentication with timing-safe verification.
- **Live Statistics Overview**: Real-time counter of total rooms, registered guests, active reservations, and pending payments.
- **Reservation Management**: Update booking statuses (`Confirmed`, `Checked In`, `Checked Out`, `Cancelled`).
- **Room Management**: Add rooms, update pricing, and toggle maintenance states (`Available`, `Maintenance`, `Unavailable`).
- **Service Catalog**: Manage amenities and pricing (Room Service, Laundry, Airport Transfer, Travel Assistance).
- **Payment Auditing**: Track transaction records, methods, and update settlement status.

---

##  Repository Structure

```text
DBMS-CAPSTONE-ALLLABS/
├── Haven_Hotel_Complete_Project/   # Complete full-stack web application
│   ├── admin/                      # Admin dashboard frontend (HTML/CSS/JS)
│   ├── config/                     # Database connection configuration
│   ├── database/                   # MongoDB seeding script & SQL schema reference
│   ├── models/                     # Mongoose data schemas (Room, Guest, Reservation, etc.)
│   ├── public/                     # Customer portal frontend (Booking, Auth, Payment)
│   ├── test/                       # Automated test suite
│   ├── .env.example                # Environment variables template
│   ├── package.json                # Project dependencies & scripts
│   ├── README.md                   # Application-specific documentation
│   └── server.js                   # Express server & REST API endpoints
├── ASSIGNMENT_3.zip                # Assignment 3 archive
├── LAB1.docx                       # Lab 1 Report
├── LAB2.docx                       # Lab 2 Report
├── LAB3.docx                       # Lab 3 Report
├── LAB4.docx                       # Lab 4 Report
├── .gitignore                      # Git ignore rules
├── package.json                    # Root workspace package runner
└── README.md                       # Main repository portfolio documentation
```

---

##  Database Architecture (MongoDB Schemas)

1. **Room (`rooms`)**: `room_id`, `room_number`, `room_type`, `price_per_night`, `capacity`, `room_status`
2. **Guest (`guests`)**: `guest_id`, `full_name`, `email` (unique index), `phone`, `password_hash`
3. **Reservation (`reservations`)**: `reservation_id`, `guest_id`, `room_id`, `check_in`, `check_out`, `booking_date`, `booking_status`
4. **Payment (`payments`)**: `payment_id`, `reservation_id`, `amount`, `payment_method`, `payment_status`, `payment_date`
5. **Service (`services`)**: `service_id`, `service_name`, `description`, `service_price`
6. **Counter (`counters`)**: Atomic sequence counters for human-readable numeric identifiers.

---

##  Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local Community Server or MongoDB Atlas URI)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/HimanshiRawal/DBMS-CAPSTONE-ALLLABS.git
cd DBMS-CAPSTONE-ALLLABS/Haven_Hotel_Complete_Project
npm install
```

### 2. Environment Setup
Create a `.env` file inside `Haven_Hotel_Complete_Project/` (reference `.env.example`):
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/HotelManagement
SESSION_SECRET=haven-hotel-secret-key-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisPassword123!
```

### 3. Database Seeding (Optional)
The server auto-seeds initial rooms and services upon first boot. You can also seed manually:
```bash
npm run seed
```

### 4. Running the Application
Start the server:
```bash
npm start
```
Or with auto-reload:
```bash
npm run dev
```

---

## 🔗 Portals & Default Credentials

| Portal | URL | Credentials |
| :--- | :--- | :--- |
| **Customer Booking** | `http://localhost:3000/` | Public Access |
| **Guest Login** | `http://localhost:3000/auth` | **Email:** `guest@havenhotel.in`<br>**Password:** `Guest1234!` |
| **Admin Dashboard** | `http://localhost:3000/admin-login` | **Username:** `admin`<br>**Password:** `ChangeThisPassword123!` |

---

##  DBMS Lab Reports & Assignments

- **Lab 1 (`LAB1.docx`)**: Database design, entity relationship diagrams (ERD), and relational model mapping.
- **Lab 2 (`LAB2.docx`)**: SQL schema definition (DDL), primary and foreign key constraints, table creation.
- **Lab 3 (`LAB3.docx`)**: Data manipulation (DML), complex SQL queries, nested subqueries, and join operations.
- **Lab 4 (`LAB4.docx`)**: Normalization (1NF, 2NF, 3NF, BCNF), indexing, and transaction analysis.
- **Assignment 3 (`ASSIGNMENT_3.zip`)**: Backend integration and intermediate project submission.
