// model/paymentSchema.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: false
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },

    couponCode: {
      type: String,
      default: null
    },

    amount: {
      type: Number,
      required: true
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE", "WALLET"],
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending"
    },

    gatewayOrderId: String,
    gatewayPaymentId: String,
    gatewaySignature: String,

    paymentDate: Date,
    failureReason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
