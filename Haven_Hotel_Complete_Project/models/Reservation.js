const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    reservation_id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    guest_id: {
      type: Number,
      required: true,
      index: true
    },
    room_id: {
      type: Number,
      required: true,
      index: true
    },
    check_in: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    check_out: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    booking_date: {
      type: Date,
      default: Date.now
    },
    booking_status: {
      type: String,
      required: true,
      enum: ["Confirmed", "Checked In", "Checked Out", "Cancelled"],
      default: "Confirmed"
    }
  },
  {
    timestamps: true
  }
);

reservationSchema.index({
  room_id: 1,
  check_in: 1,
  check_out: 1,
  booking_status: 1
});

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;
