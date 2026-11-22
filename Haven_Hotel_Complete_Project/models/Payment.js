const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    payment_id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    reservation_id: {
      type: Number,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    payment_date: {
      type: Date,
      default: Date.now
    },
    payment_method: {
      type: String,
      enum: ["Demo UPI", "UPI", "Card", "Cash"],
      default: "Demo UPI"
    },
    payment_status: {
      type: String,
      enum: ["Pending", "Completed", "Paid", "Refunded"],
      default: "Pending"
    }
  },
  {
    timestamps: true
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
