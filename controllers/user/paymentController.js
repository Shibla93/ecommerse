import Payment from "../../model/paymentSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Product from "../../model/productSchema.js";
import Category from "../../model/categorySchema.js";
import Order from "../../model/orderSchema.js";
import Coupon from "../../model/coupenSchema.js";
import razorpay from "../../config/razorpay.js";
import crypto from "crypto";

// const createRazorpayOrder = async (req, res) => {
//   try {
//     const userId = req.session.user;

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart || cart.items.length === 0) {
//       return res.json({ success: false, message: "Cart empty" });
//     }

//     let subTotal = 0;
//     cart.items.forEach(item => {
//       subTotal += item.price * item.quantity;
//     });

//     const tax = Math.round(subTotal * 0.05);

//  let discount = 0;

// if (req.session.appliedCoupon) {
//   discount = Number(req.session.appliedCoupon.discount) || 0;




// }

// const totalAmount = Math.max(
//   Number(subTotal) + Number(tax) - Number(discount),
//   1
// );
// console.log("Session Coupon:", req.session.appliedCoupon);
//    console.log("SubTotal:", subTotal);
// console.log("Tax:", tax);
// console.log("Discount:", discount);
// console.log("Total:", totalAmount);
//     // Razorpay order
//     const razorpayOrder = await razorpay.orders.create({
//       amount: totalAmount * 100,
//       currency: "INR",
//       receipt: "TMP-" + Date.now()
//     });


//     // Save payment (NO orderId yet)
//     await Payment.create({
//       userId,
//       amount: totalAmount,
//       discount: discount,
//       paymentMethod: "ONLINE",
//       status: "pending",
//       gatewayOrderId: razorpayOrder.id
//     });

//     res.json({
//       success: true,
//       keyId: process.env.RAZORPAY_KEY_ID,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount
//     });

//   } catch (error) {
//     console.error("Create Razorpay Order Error:", error);
//     res.json({ success: false, message: "Payment init failed" });
//   }
// };
// const createRazorpayOrder = async (req, res) => {
//   try {
//     const userId = req.session.user;

//     const cart = await Cart.findOne({ userId }).populate("items.productId");
//     if (!cart || cart.items.length === 0) {
//       return res.json({ success: false, message: "Cart empty" });
//     }

//     let subTotal = 0;
//     cart.items.forEach(item => {
//       subTotal += item.price * item.quantity;
//     });

//     const tax = Math.round(subTotal * 0.05);

//     let discount = 0;
//     if (req.session.appliedCoupon) {
//       discount = Number(req.session.appliedCoupon.discount) || 0;
//     }

//     const totalAmount = Math.max(subTotal + tax - discount, 1);

//     // 🟢 CREATE ORDER FIRST
//     const order = new Order({
//       orderNumber: "ORD-" + Date.now(),
//       userId,
//       orderedItems: cart.items.map(item => ({
//         productId: item.productId._id,
//         variantId: item.variantId,
//         quantity: item.quantity,
//         purchasedPrice: item.price
//       })),
//       subTotal,
//       tax,
//       couponDiscount: discount,
//       offerDiscount: 0,
//       totalAmount,
//       paymentMethod: "ONLINE",
//       paymentStatus: "pending",
//       orderStatus: "pending_payment"
//     });

//     await order.save();

//     // 🔵 CREATE RAZORPAY ORDER
//     const razorpayOrder = await razorpay.orders.create({
//       amount: totalAmount * 100,
//       currency: "INR",
//       receipt: "TMP-" + Date.now()
//     });

//     // 🟡 SAVE PAYMENT
//     await Payment.create({
//       userId,
//       orderId: order._id,
//       amount: totalAmount,
//       discount,
//       paymentMethod: "ONLINE",
//       status: "pending",
//       gatewayOrderId: razorpayOrder.id
//     });

//     res.json({
//       success: true,
//       keyId: process.env.RAZORPAY_KEY_ID,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       orderId: order._id
//     });

//   } catch (error) {
//     console.error("Create Razorpay Order Error:", error);
//     res.json({ success: false, message: "Payment init failed" });
//   }
// };
const createRazorpayOrder = async (req, res) => {
  try {

    console.log("BODY DATA:", req.body);
    const userId = req.session.user;
    const { orderId, addressId } = req.body;

    let order;


    if (orderId) {

      order = await Order.findOne({ _id: orderId, userId });

      if (!order) {
        return res.json({ success: false, message: "Order not found" });
      }

      if (order.paymentStatus === "paid") {
        return res.json({ success: false, message: "Already paid" });
      }

    }


    else {
      const cart = await Cart.findOne({ userId }).populate({
        path: "items.productId",
        populate: {
          path: "category"
        }
      });

      if (!cart || cart.items.length === 0) {
        return res.json({ success: false, message: "Cart empty" });
      }


      let subTotal = 0;
      let offerDiscount = 0;
         let shippingCharge = 0;

      const orderedItems = cart.items.map(item => {

        const product = item.productId;

        const variant = product.variants.find(
          v => v._id.toString() === item.variantId.toString()
        );

        if (!variant) return;
        console.log("Product Offer:", product.productOffer);
console.log("Category Offer:", product.category?.categoryOffer);

        const maxOffer = Math.max(
          product.productOffer || 0,
          product.category?.categoryOffer || 0
        );

console.log("Max Offer:", maxOffer);
        const discountAmount = variant.price * (maxOffer / 100);
        const finalPrice = Math.round(variant.price - discountAmount);

        subTotal += finalPrice * item.quantity;


    if (subTotal < 2500) {
  shippingCharge = 50;
}
        offerDiscount += (variant.price - finalPrice) * item.quantity;

        return {
          productId: product._id,
          variantId: item.variantId,
          quantity: item.quantity,
          purchasedPrice: finalPrice
        };

      });

      const tax = Math.round(subTotal * 0.05);
     let discount = 0;

if (req.session.appliedCoupon && req.session.appliedCoupon.couponId) {

  const coupon = await Coupon.findById(req.session.appliedCoupon.couponId);

  if (
    coupon &&
    coupon.isActive &&
    new Date(coupon.expiryDate) > new Date()
  ) {
    discount = Number(req.session.appliedCoupon.discount) || 0;
  } else {
    req.session.appliedCoupon = null; // invalid coupon remove
  }
}
    console.log("discount:",discount)
    console.log("subTotal:",subTotal)

      const totalAmount = subTotal + tax - discount+shippingCharge;

      const addressDoc = await Address.findOne({ userId });
      if (!addressDoc) {
        return res.json({ success: false, message: "Address not found" });
      }

      const address = addressDoc.address.id(addressId);
      if (!address) {
        return res.json({ success: false, message: "Invalid address" });
      }

      order = new Order({
        orderNumber: "ORD-" + Date.now(),
        userId,
        orderedItems,
        subTotal,
        tax,
        couponDiscount: discount,
        offerDiscount: offerDiscount,
        shippingCharge,
        totalAmount,
        paymentMethod: "ONLINE",
        paymentStatus: "pending",
        orderStatus: "pending_payment",
        shippingAddress: {
          name: address.name,
          house: address.house,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone,
        }
      });

      await order.save();
    }

    /* ==============================
       🟢 CREATE RAZORPAY ORDER
    ============================== */

    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalAmount * 100,
      currency: "INR",
      receipt: "RCPT-" + Date.now()
    });

    /* ==============================
       🟡 CREATE PAYMENT ENTRY
    ============================== */

    await Payment.create({
      userId,
      orderId: order._id,
      amount: order.totalAmount,
      paymentMethod: "ONLINE",
      status: "pending",
      gatewayOrderId: razorpayOrder.id
    });

    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      orderId: order._id
    });

  } catch (error) {
    console.error("Create Razorpay Order Error:", error);
    res.json({ success: false });
  }
};
/* =====================================================
   VERIFY RAZORPAY PAYMENT (CREATE ORDER HERE)
===================================================== */
// const verifyRazorpayPayment = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       addressId
//     } = req.body;

//     const payment = await Payment.findOne({
//       gatewayOrderId: razorpay_order_id,
//       status: "pending"
//     });

//     if (!payment) {
//       return res.json({ success: false, message: "Payment not found" });
//     }


//     const generatedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//       .digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//       payment.status = "failed";
//       payment.failureReason = "Signature mismatch";
//       await payment.save();

//       return res.json({
//         success: false,
//         redirectUrl: "/order/failure"
//       });
//     }

//     /* ---------------- PAYMENT SUCCESS ---------------- */
//     payment.status = "success";
//     payment.gatewayPaymentId = razorpay_payment_id;
//     payment.gatewaySignature = razorpay_signature;
//     payment.paymentDate = new Date();
//     await payment.save();

//     /* ---------------- CREATE ORDER ---------------- */
//     const cart = await Cart.findOne({ userId }).populate("items.productId");

//     let subTotal = 0;
//     cart.items.forEach(item => {
//       subTotal += item.price * item.quantity;
//     });

//     const tax = Math.round(subTotal * 0.05);
//   const discount = payment.discount || 0;

// const totalAmount = payment.amount

//     const addressDoc = await Address.findOne({ userId });
//     const shippingAddress = addressDoc.address.id(addressId);

//     const order = new Order({
//       orderNumber: "ORD-" + Date.now(),
//       userId,
//       orderedItems: cart.items.map(item => ({
//         productId: item.productId._id,
//         variantId: item.variantId,
//         quantity: item.quantity,
//         purchasedPrice: item.price
//       })),
//       subTotal,
//       tax,
//       couponDiscount: discount,
// offerDiscount: 0,
//       totalAmount,
//       paymentMethod: "ONLINE",
//       paymentStatus: "paid",
//       orderStatus: "processing",
//       shippingAddress
//     });

//     await order.save();

//     // Link payment → order
//     payment.orderId = order._id;
//     await payment.save();

//     /* ---------------- UPDATE STOCK ---------------- */
//     for (const item of order.orderedItems) {
//       const product = await Product.findById(item.productId);
//       const variant = product.variants.id(item.variantId);
//       variant.stock -= item.quantity;
//       await product.save();
//     }

//     /* ---------------- CLEAR CART ---------------- */
//     await Cart.findOneAndUpdate({ userId }, { items: [] });
//     req.session.appliedCoupon = null;

//     res.json({
//       success: true,
//       redirectUrl: `/order/success/${order._id}`
//     });

//   } catch (error) {
//     console.error("Verify Payment Error:", error);
//     res.json({ success: false, message: "Verification failed" });
//   }
// };
const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId
    } = req.body;

    const payment = await Payment.findOne({
      gatewayOrderId: razorpay_order_id,
      status: "pending"
    });

    if (!payment) {
      return res.json({ success: false, message: "Payment not found" });
    }

    const order = await Order.findById(payment.orderId);
    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    /* ---------------- VERIFY SIGNATURE ---------------- */
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    /* ---------------- PAYMENT FAILED ---------------- */
    if (generatedSignature !== razorpay_signature) {

      payment.status = "failed";
      payment.failureReason = "Signature mismatch";
      await payment.save();

      order.paymentStatus = "failed";
      order.orderStatus = "payment_failed";
      await order.save();

      return res.json({
        success: false,
        redirectUrl: `/order/failure/${order._id}`
      });
    }

    /* ---------------- PAYMENT SUCCESS ---------------- */
    payment.status = "success";
    payment.gatewayPaymentId = razorpay_payment_id;
    payment.gatewaySignature = razorpay_signature;
    payment.paymentDate = new Date();
    await payment.save();

    order.paymentStatus = "paid";
    order.orderStatus = "processing";



    await order.save();

    /* ---------------- UPDATE STOCK ---------------- */
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.productId);
      const variant = product.variants.id(item.variantId);
      variant.stock -= item.quantity;
      await product.save();
    }

    /* ---------------- CLEAR CART ---------------- */
    await Cart.findOneAndUpdate({ userId }, { items: [] });
    req.session.appliedCoupon = null;

    res.json({
      success: true,
      redirectUrl: `/order/success/${order._id}`
    });

  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.json({ success: false, message: "Verification failed" });
  }
};

const markPaymentFailed = async (req, res) => {
  try {
    const { razorpayOrderId } = req.body;

    const payment = await Payment.findOne({
      gatewayOrderId: razorpayOrderId,
      status: "pending"
    });

    if (!payment) {
      return res.json({ success: false });
    }


    payment.status = "failed";
    payment.failureReason = "Popup closed";
    await payment.save();


    await Order.findByIdAndUpdate(payment.orderId, {
      paymentStatus: "failed",
      orderStatus: "payment_failed"
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Payment Failed Handler Error:", error);
    res.json({ success: false });
  }
};
// const retryPayment = async (req, res) => {
//   try {

//     const { orderId } = req.params;

//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.json({ success: false });
//     }

//     const razorpayOrder = await razorpay.orders.create({
//       amount: order.totalAmount * 100,
//       currency: "INR",
//       receipt: order.orderNumber
//     });

//     // Create NEW payment entry (not new order)
//     await Payment.create({
//       userId: order.userId,
//       orderId: order._id,
//       amount: order.totalAmount,
//       paymentMethod: "ONLINE",
//       status: "pending",
//       gatewayOrderId: razorpayOrder.id
//     });

//     res.json({
//       success: true,
//       keyId: process.env.RAZORPAY_KEY_ID,
//       razorpayOrderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       orderId: order._id
//     });

//   } catch (error) {
//     console.log(error);
//     res.json({ success: false });
//   }
// };
 const paymentController= {
  createRazorpayOrder,
  verifyRazorpayPayment,
  markPaymentFailed,

};
 export default paymentController