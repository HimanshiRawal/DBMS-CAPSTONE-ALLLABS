require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, mongoose } = require("../config/db");
const {
  Room,
  Service,
  Guest,
  Reservation,
  Payment,
  setSequenceMinimum,
  getNextSequence
} = require("../models");

const defaultRooms = [
  {
    room_id: 1,
    room_number: "101",
    room_type: "Standard Non-AC",
    price_per_night: 1200,
    capacity: 2,
    room_status: "Available"
  },
  {
    room_id: 2,
    room_number: "102",
    room_type: "Standard AC",
    price_per_night: 1600,
    capacity: 2,
    room_status: "Available"
  },
  {
    room_id: 3,
    room_number: "201",
    room_type: "Deluxe AC",
    price_per_night: 2200,
    capacity: 3,
    room_status: "Available"
  },
  {
    room_id: 4,
    room_number: "202",
    room_type: "Family Room",
    price_per_night: 3000,
    capacity: 4,
    room_status: "Available"
  }
];

const defaultServices = [
  {
    service_id: 1,
    service_name: "Room Service",
    description: "Food and refreshments delivered to your room.",
    service_price: 250
  },
  {
    service_id: 2,
    service_name: "Laundry Service",
    description: "Convenient laundry and ironing service.",
    service_price: 150
  },
  {
    service_id: 3,
    service_name: "Airport Transfer",
    description: "Pre-booked airport pickup and drop service.",
    service_price: 800
  },
  {
    service_id: 4,
    service_name: "Travel Assistance",
    description: "Help with local sightseeing and travel information.",
    service_price: 0
  }
];

async function seedDatabase() {
  let seededRooms = 0;
  let seededServices = 0;

  for (const room of defaultRooms) {
    const existing = await Room.findOne({ room_number: room.room_number });
    if (!existing) {
      await Room.create(room);
      seededRooms++;
    }
  }

  for (const service of defaultServices) {
    const existing = await Service.findOne({ service_name: service.service_name });
    if (!existing) {
      await Service.create(service);
      seededServices++;
    }
  }

  // Seed standard demo guest if not existing
  const demoEmail = "guest@havenhotel.in";
  let demoGuest = await Guest.findOne({ email: demoEmail });
  if (!demoGuest) {
    const nextGuestId = await getNextSequence("guest_id");
    const hashedPassword = await bcrypt.hash("Guest1234!", 10);
    demoGuest = await Guest.create({
      guest_id: nextGuestId,
      full_name: "Eleanor Vance",
      email: demoEmail,
      phone: "+91 98765 43210",
      password: hashedPassword,
      role: "guest"
    });
    console.log("Seeded demo guest: guest@havenhotel.in / Guest1234!");
  } else if (!demoGuest.password) {
    demoGuest.password = await bcrypt.hash("Guest1234!", 10);
    await demoGuest.save();
  }

  await setSequenceMinimum("room_id", 4);
  await setSequenceMinimum("service_id", 4);
  await setSequenceMinimum("guest_id", 1);
  await setSequenceMinimum("reservation_id", 0);
  await setSequenceMinimum("payment_id", 0);

  if (seededRooms > 0 || seededServices > 0) {
    console.log(`Database seeded: added ${seededRooms} rooms and ${seededServices} services.`);
  } else {
    console.log("Database already has initial rooms and services.");
  }
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      console.log("Seeding complete. Disconnecting...");
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Seeding error:", err);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedDatabase,
  defaultRooms,
  defaultServices
};
