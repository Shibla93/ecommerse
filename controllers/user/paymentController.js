const Payment = require("../../model/paymentSchema");
const Address = require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");

const razorpay = require("../../config/razorpay");
const crypto = require("crypto");

/* =====================================================
   CREATE RAZORPAY ORDER (ONLY PAYMENT INIT)
===================================================== */
const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart empty" });
    }

    let subTotal = 0;
    cart.items.forEach(item => {
      subTotal += item.price * item.quantity;
    });

    const tax = Math.round(subTotal * 0.05);
    const totalAmount = subTotal + tax;

    // Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: "TMP-" + Date.now()
    });

    // Save payment (NO orderId yet)
    await Payment.create({
      userId,
      amount: totalAmount,
      paymentMethod: "ONLINE",
      status: "pending",
      gatewayOrderId: razorpayOrder.id
    });

    res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount
    });

  } catch (error) {
    console.error("Create Razorpay Order Error:", error);
    res.json({ success: false, message: "Payment init failed" });
  }
};

/* =====================================================
   VERIFY RAZORPAY PAYMENT (CREATE ORDER HERE)
===================================================== */
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

  
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      payment.status = "failed";
      payment.failureReason = "Signature mismatch";
      await payment.save();

      return res.json({
        success: false,
        redirectUrl: "/order/failure"
      });
    }

    /* ---------------- PAYMENT SUCCESS ---------------- */
    payment.status = "success";
    payment.gatewayPaymentId = razorpay_payment_id;
    payment.gatewaySignature = razorpay_signature;
    payment.paymentDate = new Date();
    await payment.save();

    /* ---------------- CREATE ORDER ---------------- */
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    let subTotal = 0;
    cart.items.forEach(item => {
      subTotal += item.price * item.quantity;
    });

    const tax = Math.round(subTotal * 0.05);
    const totalAmount = subTotal + tax;

    const addressDoc = await Address.findOne({ userId });
    const shippingAddress = addressDoc.address.id(addressId);

    const order = new Order({
      orderNumber: "ORD-" + Date.now(),
      userId,
      orderedItems: cart.items.map(item => ({
        productId: item.productId._id,
        variantId: item.variantId,
        quantity: item.quantity,
        purchasedPrice: item.price
      })),
      subTotal,
      tax,
      totalAmount,
      paymentMethod: "ONLINE",
      paymentStatus: "paid",
      orderStatus: "processing",
      shippingAddress
    });

    await order.save();

    // Link payment → order
    payment.orderId = order._id;
    await payment.save();

    /* ---------------- UPDATE STOCK ---------------- */
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.productId);
      const variant = product.variants.id(item.variantId);
      variant.stock -= item.quantity;
      await product.save();
    }

    /* ---------------- CLEAR CART ---------------- */
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.json({
      success: true,
      redirectUrl: `/order/success/${order._id}`
    });

  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.json({ success: false, message: "Verification failed" });
  }
};

/* =====================================================
   MARK PAYMENT FAILED (POPUP CLOSED)
===================================================== */
const markPaymentFailed = async (req, res) => {
  try {
    const { razorpayOrderId } = req.body;

    await Payment.updateOne(
      { gatewayOrderId: razorpayOrderId, status: "pending" },
      {
        $set: {
          status: "failed",
          failureReason: "Popup closed"
        }
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Payment Failed Handler Error:", error);
    res.json({ success: false });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  markPaymentFailed
};
