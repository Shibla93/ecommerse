const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");
const Brand = require("../../model/brandSchema");
const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema")
const Wallet = require('../../model/walletSchema');
const mongoose = require("mongoose");
const cloudinary = require('../../helpers/cloudinary');
const Order = require('../../model/orderSchema');
const { getDisplayStatus } = require("../../helpers/displayStatus");


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
    if(search) {
      filter.orderNumber= { $regex: search, $options: 'i' };
    }
  
    if (statusFilter) {
  filter.orderStatus = statusFilter;
}

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
    
      
       const tax = subTotal * 0.05; 
      const shipping = subTotal > 0 ? order.shippingCharge : 0;
      const discount = order.discount || 0;
      const totalAmount = subTotal + tax + shipping - discount;
    
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
      sortOrder,

    });

  } catch (error) {
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

    for (let item of order.orderedItems) {

      // 🔥 SAFE RETURN OBJECT (avoid undefined error)
      if (!item.return) {
        item.return = { status: "none" };
      }

      const product = await Product.findById(item.productId._id);
      if (!product) continue;

      const variant = product.variants.id(item.variantId);
      if (!variant) continue;

      // ✅ CANCEL LOGIC
      if (status === "cancelled" && item.itemStatus !== "cancelled") {
        variant.stock += item.quantity;
        item.itemStatus = "cancelled";
      }

      // ✅ RETURN APPROVAL LOGIC
      if (
        status === "returned" &&
        item.itemStatus === "return_requested"
      ) {
        variant.stock += item.quantity;

        item.itemStatus = "returned";
        item.return.status = "approved";
        item.return.approvedAt = new Date();

        // 💰 WALLET REFUND
        if (order.paymentStatus === "paid") {
          const refundAmount = item.purchasedPrice * item.quantity;

          await Wallet.updateOne(
            { userId: order.userId },
            {
              $inc: { balance: refundAmount },
              $push: {
                transactions: {
                  type: "credit",
                  amount: refundAmount,
                  reason: "Refund for returned product",
                  orderId: order._id
                }
              }
            },
            { upsert: true }
          );
        }
      }

      // ✅ NORMAL STATUS UPDATE
    if (
  !["cancelled", "returned", "return_requested"].includes(item.itemStatus) &&
  status !== "return_requested"
) {
  item.itemStatus = status;
}

      await product.save();
    }

    order.orderStatus = status;
    await order.save();

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


    if (!order) {
      return res.status(StatusCodes.BAD_REQUEST).send('Order not found');
    }
      order.displayStatus = getDisplayStatus(order);
      let subTotal = 0;

    order.orderedItems.forEach(item => {
      if (!["cancelled", "returned"].includes(item.itemStatus)) {
        subTotal += item.purchasedPrice * item.quantity;
      }
    });

    const tax = Math.round(subTotal * 0.05);
    const shipping = subTotal > 0 ? (order.shippingCharge || 0) : 0;

  const discount =Number (order.discount) || 0;

    const totalAmount= subTotal + tax + shipping - discount;

    res.render('admin/orderDetails', {
      order,
      subTotal,
      tax,
      totalAmount
    });

   

  } catch (error) {
    console.error('View Order Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });;
  }
};



module.exports = {
  listOrders,
  updateOrderStatus,
  viewOrder,
  
};
