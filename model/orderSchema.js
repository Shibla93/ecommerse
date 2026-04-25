import mongoose from 'mongoose';
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

  
  itemStatus: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "return_requested",
      "cancel_requested",
      "cancelled",
      "returned"
    ],
    default: "processing"
  },

  cancel: {
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
    couponMinPurchase: {
  type: Number,
  default: 0
},
couponCode: {
  type: String,
  default: null
},
offerDiscount: Number,
shippingCharge: {
  type: Number,
  default: 0
},
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
    "cancel_requested" 

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

export default mongoose.model("Order", orderSchema);
