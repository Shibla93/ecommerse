const User = require("../../model/userSchema");
const Address = require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");
const Wallet = require("../../model/walletSchema");
const Coupon = require("../../model/coupenSchema");
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
    req.session.appliedCoupon = null;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
    cart.items.forEach(item => subtotal += item.price * item.quantity);

    const taxes = subtotal * 0.05;
   let discount = 0; 




    const shipping = 0;
    
const total = subtotal + taxes - discount;

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
    const { addressId ,paymentMethod} = req.body;
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
    let discount = 0;

if (req.session.appliedCoupon) {

  const coupon = await Coupon.findById(req.session.appliedCoupon.couponId);

  if (
    coupon &&
    coupon.isActive &&
    new Date(coupon.expiryDate) > new Date() &&
    !coupon.usedBy.includes(userId) &&
    subTotal >= coupon.minPurchase
  ) {

    if (coupon.discountType === "percentage") {
      discount = (subTotal * coupon.discountValue) / 100;

      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }

    } else {
      discount = coupon.discountValue;
    }

    
    coupon.usedBy.push(userId);
    await coupon.save();
  }
}

    const shippingCharge = 0;
    const totalAmount = subTotal + tax - discount + shippingCharge;

    let finalPaymentStatus = "pending";

if (paymentMethod === "WALLET") {

  const wallet = await Wallet.findOne({ userId });

  if (!wallet || wallet.balance < totalAmount) {
    return res.json({
      success: false,
      message: "Insufficient wallet balance"
    });
  }

  
  wallet.balance -= totalAmount;

  
  wallet.transactions.push({
    type: "debit",
    amount: totalAmount,
    reason: "Order Payment"
  });

  await wallet.save();

  finalPaymentStatus = "paid";
}

    

    
     const order = new Order({
  orderNumber: "ORD-" + Date.now(),
  userId: userId,
  orderedItems,
  subTotal,
  tax,
  discount,
  shippingCharge,
  totalAmount,
  paymentMethod: paymentMethod,   
  paymentStatus: finalPaymentStatus,
  
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
}




const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let subTotal = 0;
    cart.items.forEach(item => subTotal += item.price * item.quantity);

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }

    if (!coupon.isActive || new Date(coupon.expiryDate) < new Date()) {
      return res.json({ success: false, message: "Coupon expired or inactive" });
    }

    if (coupon.usedBy.includes(userId)) {
      return res.json({ success: false, message: "Coupon already used" });
    }

    if (subTotal < coupon.minPurchase) {
      return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` });
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (subTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
    } else {
      discount = coupon.discountValue;
    }

    // Save applied coupon in session
    req.session.appliedCoupon = {
      couponId: coupon._id,
      code: coupon.code,
      discount
    };

    return res.json({ success: true, discount, message: `Coupon applied successfully! You saved ₹${discount}` });
    

  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  validateCheckout,
  getCheckoutPage,
  placeOrder,
  applyCoupon
 

};
