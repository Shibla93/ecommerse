const User = require("../../model/userSchema");
const Address=require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes");

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId){
return res.redirect("/login");

    }  
        
        const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

    
    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    const taxes = subtotal * 0.05; 
    const discount = 0; 
    const shipping = 0; 
    const total = subtotal + taxes - discount + shipping;
    console.log("USER ", req.user);

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
    });

  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};


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
    if (!userAddressDoc) return res.json({ success: false, message: Messages.ADDRESS_NOT_FOUND });

    const address = userAddressDoc.address.find(
  addr => addr._id.toString() === addressId
);
// console.log("ADDRESS ID", addressId);
// console.log("ALL ADDRESSES", userAddressDoc.address.map(a => a._id.toString()));

    if (!address){
       return res.json({ success: false, message: Messages.ADDRESS_NOT_FOUND });
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

    await order.save();

    
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.json({ success: true, orderId: order._id });

  } catch (error) {
    console.error("Place Order Error:", error);
    res.json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
  }
};
const orderSuccessPage = async(req, res) => {
     const userId = req.session.user;
    if (!userId){
return res.redirect("/login");

    }  
        
     const user = await User.findById(userId);
  const { orderId } = req.params;
  res.render("order-succes", {user,orderId });
};

module.exports = {
     getCheckoutPage,
     placeOrder,
orderSuccessPage
 };
