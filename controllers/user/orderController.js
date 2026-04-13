import User from "../../model/userSchema.js";
import Address from "../../model/addressSchema.js";
import Cart from "../../model/cartSchema.js";
import Product from "../../model/productSchema.js";
import Category from "../../model/categorySchema.js";
import Order from "../../model/orderSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
import Wallet from "../../model/walletSchema.js";
import { getDisplayStatus } from "../../helpers/displayStatus.js";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";



const getOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId)
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: Messages.USER_NOT_FOUND });

    const user = await User.findById(userId);
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const statusFilter = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  
    let filter = { userId };
    if (search) filter.orderNumber = { $regex: search, $options: 'i' };

  
    if (statusFilter && statusFilter !== 'payment_failed') {
      filter.orderStatus = statusFilter;
    }

    const orders = await Order.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Calculate displayStatus and totals
    orders.forEach(order => {
      order.displayStatus = getDisplayStatus(order);

      let subTotal = 0;
      order.orderedItems.forEach(item => {
        if (!["cancelled", "returned"].includes(item.itemStatus)) {
          subTotal += item.purchasedPrice * item.quantity;
        }
      });

      const tax = Math.round(subTotal * 0.05);
      const shipping = subTotal > 0 ? (order.shippingCharge || 0) : 0;
      const discount = Number(order.couponDiscount) || 0;
      
      const totalAmount = Math.max(0, subTotal + tax + shipping - discount);

      order.subTotal = subTotal;
      order.tax = tax;
      order.totalAmount = totalAmount;
    });

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orders", {
      user,
      orders,
      currentPage: page,
      totalPages,
      search,
      statusFilter,
      sortBy,
      sortOrder,
      activePage: "orders"
    });

  } catch (error) {
    console.error("Get Order Error:", error);
    res.redirect("/pageNotFound");
  }
};
const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId } = req.params;

    if (!userId) return res.redirect("/login");
    const user = await User.findById(userId);

const order = await Order.findOne({
  _id: orderId,
  userId: userId
})
.populate({
  path: "orderedItems.productId",
  populate: {
    path: "category"
  }
});

    if (!order) return res.redirect("/orders");
    let subTotal = 0;

    order.orderedItems.forEach(item => {
      if (!["cancelled", "returned"].includes(item.itemStatus)) {
        subTotal += item.purchasedPrice * item.quantity;

      }
    });

    const tax = Math.round(subTotal * 0.05);
    const shipping = subTotal > 0 ? (order.shippingCharge || 0) : 0;

    const discount = Number(order.couponDiscount) || 0;
const totalAmount = Math.max(0, subTotal + tax + shipping - discount);
    console.log(totalAmount)

    res.render("user/order-details", {
      order,
      user,
      subTotal,
      tax,
      totalAmount
    });

  } catch (error) {
    console.log(error)
    res.redirect("/pageNotFound");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderNumber, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderNumber, userId })
      .populate("orderedItems.productId");

    if (!order) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: Messages.ORDER_NOTFOUND
      });
    }

    const item = order.orderedItems.id(itemId);

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: Messages.ITEM_NOT_FOUND
      });
    }

    if (item.itemStatus === "cancelled") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Item already cancelled"
      });
    }

    if (!["processing", "shipped"].includes(item.itemStatus)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "This item cannot be cancelled"
      });
    }

    
    const product = await Product.findById(item.productId._id);
    const variant = product.variants.id(item.variantId);
    variant.stock += item.quantity;
    await product.save();


    item.itemStatus = "cancelled";
    item.cancellation = {
      isCancelled: true,
      reason,
      cancelledAt: new Date()
    };

  
    const activeItems = order.orderedItems.filter(
      i => !["cancelled", "returned"].includes(i.itemStatus)
    );

    
    if (order.paymentStatus === "paid") {

      const itemTotal = item.purchasedPrice * item.quantity;

      const orderSubtotal = order.subTotal || 0;
      const orderTax = order.tax || 0;
      const orderDiscount =
        (order.couponDiscount || 0) ;

      let refundAmount = itemTotal;

      if (orderSubtotal > 0) {

        const itemTaxShare = (itemTotal / orderSubtotal) * orderTax;

        const itemDiscountShare =
          (itemTotal / orderSubtotal) * orderDiscount;

        refundAmount = Math.round(
          itemTotal + itemTaxShare - itemDiscountShare
        );
      }
     let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = new Wallet({
      userId,
      balance: 0,
      transactions: []
    });
  }

  wallet.balance += refundAmount;

  wallet.transactions.push({
    type: "credit",
    amount: refundAmount,
    reason: "Refund for cancelled item",
    createdAt: new Date()
  });

  await wallet.save();


      if (activeItems.length === 0) {
        order.paymentStatus = "refunded";
      }
    }

    // ✅ If all items cancelled → order cancelled
    if (activeItems.length === 0) {
      order.orderStatus = "cancelled";
    }

    await order.save();

    res.json({
      success: true,
      message: "Product cancelled & refunded successfully"
    })

  } catch (error) {
    console.error("Cancel Item Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};


const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderNumber, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderNumber, userId })
      .populate("orderedItems.productId");

    if (!order) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: Messages.ORDER_NOTFOUND
      });
    }

    const item = order.orderedItems.id(itemId);

    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: Messages.ITEM_NOT_FOUND
      });
    }


    if (item.itemStatus !== "delivered") {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: Messages.RETURN_NOT_ALLOWED
      });
    }

    item.itemStatus = "return_requested";

    item.return.status = "requested";
    item.return.reason = reason;
    item.return.requestedAt = new Date();


    await order.save();

    

    res.json({
      success: true,
      message: "Return request submitted successfully"
    });

  } catch (error) {
    console.error("Return Item Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

const generateInvoice= async (req, res) => {
  try {

    const userId = req.session.user;
   const orderNumber = req.params.orderNumber;
   console.log(req.params.orderNumber);

const order = await Order.findOne({
  orderNumber,
  userId
}).populate("orderedItems.productId");

   console.log("Order:", order);
    if (!order) {
      return res.redirect("/orders");
    }



        const validItems = order.orderedItems.filter(
      (item) => item.itemStatus !== "cancelled"
    );

    const orderItems = order.orderedItems.map(item => ({
      productName: item.productId.product,
      price: item.purchasedPrice,
      quantity: item.quantity,
      status: item.itemStatus,
    }));

    res.render("user/invoice", {
      order,
      orderItems
    });

  } catch (error) {
    console.error("Invoice page error:", error);
    res.redirect("/orders");
  }
};
// const orderFailurePage = async (req, res) => {
//   try {
//     console.log('hello')
//     const userId = req.session.user;
//     if (!userId) return res.redirect("/login");

//     const user = await User.findById(userId);
//     const { orderId } = req.params;


//     if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
//       return res.redirect("/pageNotFound");
//     }
//     const order = await Order.findById(orderId);
//     if (!order) {

//       return res.redirect("/pageNotFound");
//     }

//     res.render("user/order-failure", { user, order, errorMessage: "Payment failed. Try again!" });
//   } catch (err) {
//     console.error("Order Failure Page Error:", err);
//     res.redirect("/pageNotFound");
//   }
// };
// const orderFailurePage = async (req, res) => {
//   try {
//     const userId = req.session.user;
//     if (!userId) return res.redirect("/login");

//     const user = await User.findById(userId);

//     res.render("user/order-failure", {
//       user,
//       order: null,
//       errorMessage: "Payment failed. Amount not deducted."
//     });

//   } catch (err) {
//     res.redirect("/orders");
//   }
// };

const orderFailurePage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const user = await User.findById(userId);
    const { orderId } = req.params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.redirect("/orders");
    }

    const order = await Order.findById(orderId);

    if (!order) return res.redirect("/orders");

    res.render("user/order-failure", {
      user,
      order,
      errorMessage: "Payment failed. Please retry."
    });

  } catch (err) {
    console.error(err);
    res.redirect("/orders");
  }
};
const orderSuccessPage = async (req, res) => {
  const userId = req.session.user;
  if (!userId) {
    return res.redirect("/login");

  }

  const user = await User.findById(userId);
  const { orderId } = req.params;
  res.render("user/order-succes", { user, orderId });
};

const cancelFullOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderNumber } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderNumber, userId })
      .populate("orderedItems.productId");

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    // ❌ already cancelled check
    if (order.orderStatus === "cancelled") {
      return res.json({ success: false, message: "Already cancelled" });
    }

    let totalRefund = 0;

    // 🟢 loop items
    for (let item of order.orderedItems) {

      if (["cancelled", "returned"].includes(item.itemStatus)) continue;

      // stock return
      const product = await Product.findById(item.productId._id);
      const variant = product.variants.id(item.variantId);

      if (variant) {
        variant.stock += item.quantity;
      }

      await product.save();

      const itemTotal = item.purchasedPrice * item.quantity;
      totalRefund += itemTotal;

      item.itemStatus = "cancelled";
      item.cancellation = {
        isCancelled: true,
        reason,
        cancelledAt: new Date()
      };
    }

    // 🟢 coupon/tax ignore safe refund (simple version)
    if (order.paymentStatus === "paid") {
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += totalRefund;

      wallet.transactions.push({
        type: "credit",
        amount: totalRefund,
        reason: "Full order cancellation refund",
        createdAt: new Date()
      });

      await wallet.save();

      order.paymentStatus = "refunded";
    }

    // 🟢 final status
    order.orderStatus = "cancelled";

    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



const orderController ={
  getOrder,
  getOrderDetails,
  cancelOrder,
  returnOrder,
  cancelFullOrder,
  generateInvoice,
  orderSuccessPage,
  orderFailurePage
}
 export default orderController 



