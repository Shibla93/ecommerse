const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  variantId: {
    type: Schema.Types.ObjectId,
      required: true
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
      "pending",
      "processing",
      "shipped",
      "delivered",
      "return_requested",
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
  status: {
    type: String,
    enum: ["none", "requested", "approved", "rejected"],
    default: "none"
  },
  reason: String,
  requestedAt: Date,
  approvedAt: Date,
  rejectedAt: Date,

  adminRemark: { type: String, default: "" } 
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
    couponDiscount: Number,
offerDiscount: Number,
 shippingCharge: Number,
    totalAmount: Number,

 

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE","WALLET"],
      default: "COD"
    },

    paymentStatus: {
      type: String,
      enum: ["pending","failed", "paid", "refunded"],
      default: "pending"
    },

    // 🔥 DERIVED ORDER STATUS (summary)
  orderStatus: {
  type: String,
  enum: [
      "pending_payment",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
    "return_requested",   

  ],
  default:  "pending_payment",
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
