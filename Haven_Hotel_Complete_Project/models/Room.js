const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    room_id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    room_number: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    room_type: {
      type: String,
      required: true,
      trim: true
    },
    price_per_night: {
      type: Number,
      required: true,
      min: 0
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      default: 2
    },
    room_status: {
      type: String,
      required: true,
      enum: ["Available", "Maintenance", "Unavailable"],
      default: "Available"
    }
  },
  {
    timestamps: true
  }
);

roomSchema.index({ room_status: 1, capacity: 1 });

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;
