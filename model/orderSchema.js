const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: Schema.Types.ObjectId,
  },
  quantity: {
    type: Number,
    required: true,
  },
  purchasedPrice: {
    type: Number,
    required: true,
  },
});

const orderSchema = new Schema(
  {
     orderNumber: { type: String, required: true, unique: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderedItems: [orderItemSchema],

    subTotal: {
      type: Number,
      required: true,
    },

    tax: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    shippingCharge: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },

    shippingAddress: {
      name: String,
  house: String,
  city: String,
  state: String,
  pincode: Number,
  phone: String,
    },
     cancellation: {
    isCancelled: { type: Boolean, default: false },
    reason: { type: String },
    cancelledAt: { type: Date }
  },
  return: {
    isReturned: { type: Boolean, default: false },
    reason: { type: String },
    returnedAt: { type: Date }
  }
  },
 
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports=Order