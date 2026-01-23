const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  variantId: {
    type: Schema.Types.ObjectId
  },
  quantity: {
    type: Number,
    required: true
  },
  purchasedPrice: {
    type: Number,
    required: true
  },

  // 🔥 PRODUCT LEVEL STATUS
  itemStatus: {
    type: String,
    enum: [
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "returned"
    ],
    default: "processing"
  },

  cancellation: {
    isCancelled: { type: Boolean, default: false },
    reason: String,
    cancelledAt: Date
  },

  return: {
    isReturned: { type: Boolean, default: false },
    reason: String,
    returnedAt: Date
  }
});

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    orderedItems: [orderItemSchema],

    subTotal: Number,
    tax: Number,
    discount: Number,
    shippingCharge: Number,
    totalAmount: Number,

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "COD"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending"
    },

    // 🔥 DERIVED ORDER STATUS (summary)
  orderStatus: {
  type: String,
  enum: [
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned"
  ],
  default: "processing"
}
,

    shippingAddress: {
      name: String,
      house: String,
      city: String,
      state: String,
      pincode: Number,
      phone: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
