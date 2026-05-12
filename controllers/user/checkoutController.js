import User from "../../model/userSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Product from "../../model/productSchema.js";
import Category from "../../model/categorySchema.js";
import Order from "../../model/orderSchema.js";
import Wallet from "../../model/walletSchema.js";
import Coupon from "../../model/coupenSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";

const validateCheckout = async (req, res) => {

  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");

    }


     const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: ["brand", "category"]
    });
     if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

   
    for (let item of cart.items) {
     

  const product = item.productId;


      
      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      
      if (!variant || !variant.isListed || variant.isDeleted) {
        return res.json({
          success: false,
          message: `${product.product} is unavailable`
        });
      }

      if (variant.stock < item.quantity) {
        return res.json({
          success: false,
          message: `Only ${variant.stock} items available for ${product.product}`
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
    const cart = await Cart.findOne({ userId }).populate({
  path: "items.productId",
  populate: { path: "category" }
});

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    let subtotal = 0;
  let offerDiscount = 0;

cart.items.forEach(item => {

  const product = item.productId;

  const variant = product.variants.find(
    v => v._id.toString() === item.variantId.toString()
  );

  if (!variant) return;

  const maxOffer = Math.max(
    product.productOffer || 0,
    product.category?.categoryOffer || 0
  );

  const discount = variant.price * (maxOffer / 100);
  const finalPrice = Math.round(variant.price - discount);

  const itemTotal = finalPrice * item.quantity;

  subtotal += itemTotal;

  offerDiscount += (variant.price - finalPrice) * item.quantity;

});

    const taxes =Math.round( subtotal * 0.05);
  
  let discount=0



    let shipping = 0;
        if (subtotal <2500) {
  shipping = 50;
}
    
const total = subtotal + taxes - discount+shipping;
console.log("discount:",discount)
    console.log("subTotal:",subtotal)
    const coupons = await Coupon.find({
  isActive: true,
  expiryDate: { $gt: new Date() },
  $expr: { $lt: [{ $size: "$usedBy" }, "$usageLimit"] }
});
    const userAddress = await Address.findOne({ userId });
    let addresses = userAddress ? userAddress.address : [];


if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
  addresses[0].isDefault = true;
  await userAddress.save();
}

    res.render("checkout", {
      user,
addresses: addresses,
      cart,
        offerDiscount,
      subtotal,
      taxes,
      discount,
      shippingCharge:shipping,
      total,
       coupons,
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



    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: {
        path: "category"
      }
    });
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
   const product = item.productId;
        const variant = product.variants.find(
    v => v._id.toString() === item.variantId.toString()
  );

  if (!variant || !variant.isListed || variant.isDeleted) {
    return res.json({
      success: false,
      message: `${product.product} is unavailable`
    });
  }

  if (variant.stock < item.quantity) {
    return res.json({
      success: false,
      message: `Only ${variant.stock} items available`
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
let offerDiscount = 0;

cart.items.forEach(item => {

  const product = item.productId;

  const variant = product.variants.find(
    v => v._id.toString() === item.variantId.toString()
  );

  if (!variant) return;

  const maxOffer = Math.max(
    product.productOffer || 0,
    product.category?.categoryOffer || 0
  );

  const discountAmount = variant.price * (maxOffer / 100);
  const finalPrice = Math.round(variant.price - discountAmount);

  subTotal += finalPrice * item.quantity;

  offerDiscount += (variant.price - finalPrice) * item.quantity;

});
    const tax = Math.round(subTotal * 0.05);
    let discount = 0;
      
    let couponCode = null;
    let couponMinPurchase = 0;
console.log("Session coupon:", req.session.appliedCoupon);
console.log("Discount calculated:", discount)
if (req.session.appliedCoupon) {

  const coupon = await Coupon.findById(req.session.appliedCoupon.couponId)
  
  if (
    coupon &&
    coupon.isActive &&
    new Date(coupon.expiryDate) > new Date() &&
   !coupon.usedBy.some(id => id.toString() === userId.toString()) &&
    subTotal >= coupon.minPurchase
  ) {
couponCode = coupon.code;
couponMinPurchase = coupon.minPurchase;
    // order.couponMinPurchase = coupon.minPurchase;
    // order.couponCode = coupon.code;
    if (coupon.discountType === "percentage") {
discount = Math.round((subTotal * coupon.discountValue) / 100);

      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }

    } else {
      discount = coupon.discountValue;
    }

    console.log("discount:",discount)
    console.log("subTotal:",subTotal)
    coupon.usedBy.push(userId);
    await coupon.save();
  }
}

    let shippingCharge = 0;

    if (subTotal < 2500) {
  shippingCharge = 50;
}
    const totalAmount = subTotal + tax - discount + shippingCharge;
    if (paymentMethod === "COD" && totalAmount > 5000) {
  return res.json({
    success: false,
    message: "Cash on Delivery not available for orders above ₹5000"
  });
}

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
  offerDiscount: offerDiscount,   
   couponDiscount: discount,  
  
couponMinPurchase: couponMinPurchase,
couponCode: couponCode,
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
     const product = item.productId;

const variant = product.variants.find(
  v => v._id.toString() === item.variantId.toString()
);
      if (variant.stock < item.quantity) {
  return res.json({
    success: false,
    message: "Stock changed, please try again"
  });
}

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
if (coupon.usedBy.some(id => id.toString() === userId.toString())) {
      return res.json({ success: false, message: "Coupon already used" });
    }

    if (subTotal < coupon.minPurchase) {
      return res.json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required` });
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
     discount = Math.round((subTotal * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
    } else {
      discount = coupon.discountValue;
    }

  
    req.session.appliedCoupon = {
      couponId: coupon._id,
      code: coupon.code,
      discount
    };
   
    return res.json({ success: true, discount, message: `Coupon applied successfully! You saved ₹${discount}` });
    

  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};

const removeCoupon = (req, res) => {

   req.session.appliedCoupon = null;

  return res.json({
    success: true,
    message: "Coupon removed successfully"
  });
};
const  checkoutController= {
  validateCheckout,
  getCheckoutPage,
  placeOrder,
  applyCoupon,
  removeCoupon
 

};
export default  checkoutController