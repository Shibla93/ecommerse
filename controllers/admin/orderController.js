import Messages from '../../constants/messages.js';
import StatusCodes from '../../constants/StatusCodes.js';
import Brand from '../../model/brandSchema.js';
import Category from '../../model/categorySchema.js';
import Product from '../../model/productSchema.js';
import Wallet from '../../model/walletSchema.js';
import Coupon from '../../model/coupenSchema.js';
import mongoose from 'mongoose';
import cloudinary from '../../helpers/cloudinary.js';
import Order from '../../model/orderSchema.js';
import { getDisplayStatus } from '../../helpers/displayStatus.js';
import { calculateItemRefund } from "../../helpers/refundCalculator.js";


const listOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const statusFilter = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    let filter = {};
    if (search) filter.orderNumber = { $regex: search, $options: 'i' };
    if (statusFilter) filter.orderStatus = statusFilter;

    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

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
      const discount = subTotal > 0 ? Number(order.couponDiscount) || 0 : 0;

const totalAmount = Math.max(
  0,
  subTotal + tax + shipping - discount
);

      order.subTotal = subTotal;
      order.tax = tax;
      order.totalAmount = totalAmount;
    });

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.render('admin/ordersList', {
      orders,
      currentPage: page,
      totalPages,
      search,
      statusFilter,
      sortBy,
      sortOrder
    });

  } catch (error) {
    console.error("Admin List Orders Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};
// const updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status } = req.body;

//     const order = await Order.findById(orderId)
//       .populate('orderedItems.productId');

//     if (!order) {
//       return res.json({
//         success: false,
//         message: Messages.ORDER_NOTFOUND
//       });
//     }


//     for (let item of order.orderedItems) {
//       const product = await Product.findById(item.productId._id);
//       const variant = product.variants.id(item.variantId);

//       if (!variant) continue;


//            if (
//         status === "cancelled" &&
//         item.itemStatus !== "cancelled"
//       ) {
//         variant.stock += item.quantity;
//         item.itemStatus = "cancelled";
//       }

//        if (
//         status === "returned" &&
//         item.itemStatus === "return_requested"
//       ) {
//         variant.stock += item.quantity;
//         item.itemStatus = "approved";
//         item.return.approvedAt = new Date();


//         if (order.paymentStatus === "paid") {

//           const refundAmount = item.purchasedPrice * item.quantity;

//           await Wallet.updateOne(
//             { userId: order.userId },
//             {
//               $inc: { balance: refundAmount },
//               $push: {
//                 transactions: {
//                   type: "credit",
//                   amount: refundAmount,
//                   reason: "Refund for returned product",
//                   orderId: order._id
//                 }
//               }
//             },
//             { upsert: true }
//           );
//         }
//       }

//       }


//      if (
//         !["cancelled", "returned"].includes(item.itemStatus) &&
//         !["cancelled", "returned"].includes(status)
//       ) {
//         item.itemStatus = status;
//       }

//       await product.save();


//     order.orderStatus = status
//     await order.save();

//     return res.json({
//       success: true,
//       message: "Order status updated successfully"
//     });

//   } catch (error) {
//     console.error("Status Update Error:", error);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: Messages.INTERNAL_SERVER_ERROR
//     });
//   }

// }
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId)
      .populate('orderedItems.productId');

    if (!order) {
      return res.json({
        success: false,
        message: Messages.ORDER_NOTFOUND
      });
    }

    const currentStatus = order.orderStatus;


    if (
      (currentStatus === "shipped" && status === "processing") ||
      (currentStatus === "delivered" && ["processing", "shipped"].includes(status)) ||
      currentStatus === "cancelled" ||
      currentStatus === "returned"
    ) {
      return res.json({
        success: false,
        message: "Rollback to previous state not allowed"
      });
    }


    for (let item of order.orderedItems) {


      if (!item.return) {
        item.return = { status: "none" };
      }

      const product = await Product.findById(item.productId._id);
      if (!product) continue;

      const variant = product.variants.id(item.variantId);
      if (!variant) continue;

      
    if (status === "cancel_requested" && item.itemStatus === "processing") {

  item.itemStatus = "cancel_requested";

  item.cancel = {
    status: "requested",
    requestedAt: new Date()
  };

}

      if (
        status === "returned" &&
        item.itemStatus === "return_requested"
      ) {




        variant.stock += item.quantity;
        item.itemStatus = "returned";
        item.return.status = "approved";
        item.return.approvedAt = new Date();
      }



      if (
        !["cancelled", "returned", "return_requested","cancel_requested"].includes(item.itemStatus) &&
        status !== "return_requested"
      ) {
        item.itemStatus = status;
      }

      await product.save();
    }

    const newStatus = status.toLowerCase();   

console.log("STATUS FROM FRONTEND:", status);
console.log("CURRENT STATUS:", currentStatus);
const allCancelled = order.orderedItems.every(
  i => i.itemStatus === "cancelled"
);

const allReturned = order.orderedItems.every(
  i => i.itemStatus === "returned"
);

if (allCancelled) order.orderStatus = "cancelled";
else if (allReturned) order.orderStatus = "returned";
else if (!["cancel_requested", "return_requested"].includes(newStatus)) {
  order.orderStatus = newStatus;
}      

if (
  newStatus === "delivered" &&           
  order.paymentMethod === "COD" &&
  order.paymentStatus !== "paid"
) {
  order.paymentStatus = "paid";
}
console.log("Before Save:", order.orderStatus);

    await order.save();
console.log("After Save:", order.orderStatus);
    return res.json({
      success: true,
      message: "Order status updated successfully"
    });

  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

const viewOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'name email phone')
      .populate('orderedItems.productId', 'product');

    if (!order) return res.status(StatusCodes.BAD_REQUEST).send('Order not found');

    order.displayStatus = getDisplayStatus(order);

    let subTotal = 0;
    order.orderedItems.forEach(item => {
      if (!["cancelled", "returned"].includes(item.itemStatus)) {
        subTotal += item.purchasedPrice * item.quantity;
      }
    });

    const tax = Math.round(subTotal * 0.05);
    const shipping = subTotal > 0 ? (order.shippingCharge || 0) : 0;
   const discount = subTotal > 0 ? Number(order.couponDiscount) || 0 : 0;

const totalAmount = Math.max(
  0,
  subTotal + tax + shipping - discount
);

    res.render('admin/orderDetails', {
      order,
      subTotal,
      tax,
      totalAmount
    });

  } catch (error) {
    console.error('Admin View Order Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
  }
};
const approveItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { remark } = req.body;

    const order = await Order.findById(orderId).populate("orderedItems.productId");
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.orderedItems.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    const product = await Product.findById(item.productId._id);
    const variant = product.variants.id(item.variantId);

    if (item.itemStatus === "return_requested") {
      item.itemStatus = item.itemStatus === "return_requested" ? "returned" : "cancelled";
      variant.stock += item.quantity;

      item.return = item.return || {};
      item.return.status = "approved";
      item.return.adminRemark = remark || "";
      item.return.approvedAt = new Date();
    
      if (order.paymentStatus === "paid" && order.paymentMethod !== "COD") {



    const refundAmount = calculateItemRefund(order,item);
        await Wallet.updateOne(
          { userId: order.userId },
          {
            $inc: { balance: refundAmount },
            $push: { transactions: { type: "credit", amount: refundAmount, reason: "Refund for returned item", orderId: order._id } }
          },
          { upsert: true }
        );
      }


const allReturned = order.orderedItems.every(
  item => item.itemStatus === "returned"
);


const allCancelled = order.orderedItems.every(
  item => item.itemStatus === "cancelled"
);


if (allReturned) {
  order.orderStatus = "returned";
} else if (allCancelled) {
  order.orderStatus = "cancelled";
}
      await product.save();
      await order.save();

      return res.json({ success: true, message: "Item approved successfully" });
    }

    return res.json({ success: false, message: "Item is not eligible for approval" });
  } catch (error) {
    console.error(error);
   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};
const approveCancel = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId)
      .populate("orderedItems.productId");

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const item = order.orderedItems.id(itemId);

    if (!item || item.itemStatus !== "cancel_requested") {
      return res.json({ success: false, message: "Invalid item" });
    }

    const product = await Product.findById(item.productId._id);
    const variant = product?.variants.id(item.variantId);

    if (!variant) {
      return res.json({ success: false, message: "Variant not found" });
    }

    
    variant.stock += item.quantity;

    item.cancel = item.cancel || {};

    
    item.itemStatus = "cancelled";
    item.cancel.status = "approved";
    item.cancel.approvedAt = new Date();

  
    if (order.paymentStatus === "paid") {

      const refundAmount = calculateItemRefund(order,item);

      await Wallet.updateOne(
        { userId: order.userId },
        {
          $inc: { balance: refundAmount },
          $push: {
            transactions: {
              type: "credit",
              amount: refundAmount,
              reason: "Refund for cancelled item",
              orderId: order._id,
              createdAt: new Date()
            }
          }
        },
        { upsert: true }
      );
    }

    await product.save();

    // ✅ full order cancel check
    const allCancelled = order.orderedItems.every(
      i => i.itemStatus === "cancelled"
    );

    if (allCancelled) {
      order.orderStatus = "cancelled";
      order.paymentStatus = "refunded";
    }

    await order.save();

    res.json({ success: true });

  } catch (error) {
    console.error("Approve Cancel Error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};
const rejectItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { remark } = req.body;

    const order = await Order.findById(orderId)
      .populate("orderedItems.productId");

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    const item = order.orderedItems.id(itemId);

    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

  
    if (item.itemStatus === "return_requested") {

      item.itemStatus = "delivered";

      item.return = item.return || {};
      item.return.status = "rejected";
      item.return.adminRemark = remark;
      item.return.rejectedAt = new Date();

    }

    
    else if (item.itemStatus === "cancel_requested") {

      // previous status restore
      item.itemStatus = "processing"; 
      // (or "shipped" if needed)

      item.cancel = item.cancel || {};
      item.cancel.status = "rejected";
      item.cancel.adminRemark = remark;
      item.cancel.rejectedAt = new Date();
    }

    else {
      return res.json({ success: false, message: "Invalid action" });
    }

    await order.save();

    res.json({ success: true });

  } catch (error) {
    console.error("Reject Error:", error);
     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};



const orderController= {
  listOrders,
  updateOrderStatus,
  viewOrder,
  approveItem,
  rejectItem,
  approveCancel
};

export default orderController
