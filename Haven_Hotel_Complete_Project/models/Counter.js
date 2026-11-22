const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
});

const Counter = mongoose.model("Counter", counterSchema);

async function getNextSequence(sequenceName) {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  return counter.seq;
}

async function setSequenceMinimum(sequenceName, minimumValue) {
  const existing = await Counter.findById(sequenceName);
  if (!existing || existing.seq < minimumValue) {
    await Counter.findByIdAndUpdate(
      sequenceName,
      { $set: { seq: minimumValue } },
      { upsert: true }
    );
  }
}

module.exports = {
  Counter,
  getNextSequence,
  setSequenceMinimum
};
