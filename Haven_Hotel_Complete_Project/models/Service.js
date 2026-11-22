const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    service_id: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    service_name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    service_price: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
