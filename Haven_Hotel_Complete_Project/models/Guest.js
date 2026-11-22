const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    guest_id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    full_name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      default: null
    },
    role: {
      type: String,
      enum: ["guest", "admin"],
      default: "guest"
    }
  },
  {
    timestamps: true
  }
);

const Guest = mongoose.model("Guest", guestSchema);

module.exports = Guest;
