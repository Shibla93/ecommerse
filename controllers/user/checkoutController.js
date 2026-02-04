const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes");
const razorpay = require("../../config/razorpay");
const crypto = require("crypto");
const { error } = require("console");
const mongoose = require("mongoose");


const validateCheckout = async (req, res) => {

  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");

    }

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    for (let item of cart.items) {
      const product = await Product.findById(item.productId._id);
      const variant = product.variants.id(item.variantId);

      if (!variant || variant.stock < item.quantity) {
        return res.json({
          success: false,
          message: `${Messages.INSUFFICIENT_STOCK} for ${product.product}`

        });
      }
    }
    return res.json({ success: true });

  } catch (err) {
    return res.json({ success: false, message: Messages.INTERNAL_SERVER_ERROR })
  }
}


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
    cart.items.forEach(item => subtotal += item.price * item.quantity);

    const taxes = subtotal * 0.05;
    const discount = 0;
    const shipping = 0;
    const total = subtotal + taxes;

    const userAddress = await Address.findOne({ userId });

    res.render("checkout", {
      user,
      addresses: userAddress ? userAddress.address : [],
      cart,
      subtotal,
      taxes,
      discount,
      shipping,
      total,
      razorpayKey: process.env.RAZORPAY_KEY_ID

    });

  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
}



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId } = req.body;
    console.log("USER", userId);
    if (!userId) return res.json({ success: false, message: Messages.USER_NOT_FOUND });



    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: Messages.CART_EMPTY });
    }


    const userAddressDoc = await Address.findOne({ userId });
    if (!userAddressDoc) {
      return res.json({ success: false, message: Messages.ADDRESS_NOT_FOUND });
    }
    const address = userAddressDoc.address.find(
      addr => addr._id.toString() === addressId
    );


    if (!address) {
      return res.json({ success: false, message: Messages.ADDRESS_NOT_FOUND });
    }

    for (let item of cart.items) {
      const product = await Product.findById(item.productId._id);
      const variant = product.variants.id(item.variantId);

      if (!variant || variant.stock < item.quantity) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: Messages.OUT_OF_STOCK
        });
      }
    }



    const orderedItems = cart.items.map(item => ({
      productId: item.productId._id,
      variantId: item.variantId,
      quantity: item.quantity,
      purchasedPrice: item.price
    }));


    let subTotal = 0;
    cart.items.forEach(item => subTotal += item.price * item.quantity);
    const tax = subTotal * 0.05;
    const discount = 0;
    const shippingCharge = 0;
    const totalAmount = subTotal + tax - discount + shippingCharge;

    const orderNumber = "ORD" + Date.now();

    const order = new Order({
      orderNumber: "ORD-" + Date.now(),
      userId: userId,
      orderedItems,
      subTotal,
      tax,
      discount,
      shippingCharge,
      totalAmount,
      paymentMethod: "COD",
      paymentStatus: "pending",
      orderStatus: "processing",
      shippingAddress: {
        name: address.name,
        house: address.house,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
      }
    });

    for (let item of cart.items) {
      const product = await Product.findById(item.productId._id);
      const variant = product.variants.id(item.variantId);

      variant.stock -= item.quantity;
      await product.save();
    }


    await order.save();


    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.json({ success: true, orderId: order._id });

  } catch (error) {
    console.error("Place Order Error:", error);
    res.json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId } = req.body;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    // 💰 Calculate amounts
    let subTotal = 0;
    cart.items.forEach(item => subTotal += item.price * item.quantity);
    const tax = Math.round(subTotal * 0.05);
const totalAmount = subTotal + tax;

    // 🧾 CREATE DB ORDER FIRST (THIS WAS MISSING)
    const dbOrder = new Order({
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
      paymentStatus: "pending",
      orderStatus: "processing"
    });

    await dbOrder.save();

    // 💳 CREATE RAZORPAY ORDER
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // paise
      currency: "INR",
      receipt: dbOrder.orderNumber
    });

    res.json({
      success: true,
       razorpayKey: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      orderId: dbOrder._id
    });

  } catch (err) {
    console.error("RAZORPAY CREATE ORDER ERROR 🔥", err);
    res.json({ success: false, message: "Failed to create Razorpay order" });
  }
};



module.exports = {
  validateCheckout,
  getCheckoutPage,
  placeOrder
 

};
