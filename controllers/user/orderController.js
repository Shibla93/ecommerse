const User = require("../../model/userSchema");
const Address=require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes");
const PDFDocument = require('pdfkit');

const getOrder = async (req, res) => {
  try {
    const userId = req.session.user;
console.log("USER", userId);

    if (!userId) return res.json({ success: false, message: Messages.USER_NOT_FOUND });
   const user = await User.findById(userId);

    const query = req.query.query || "";

    const orders = await Order.find({
      userId,
      ...(query && { orderNumber: { $regex: query, $options: "i" } })
    }).sort({ createdAt: -1 });

    res.render("user/orders", {
      user,      
      orders,
      query,
      activePage: "orders"     
    });

  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};


const getOrderDetails=async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId } = req.params;

    if (!userId) return res.redirect("/login");
 const user = await User.findById(userId);
  
    const order = await Order.findOne({
      _id: orderId,
      userId: userId
    })
      .populate("orderedItems.productId")
      .populate("shippingAddress");

    if (!order) return res.redirect("/orders");

    res.render("user/order-details", {
      order,
      user
    });

  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderNumber = req.params.orderNumber;

    const {reason } = req.body;

    console.log("USER ", userId);

    const order = await Order.findOne({ orderNumber, userId })
      .populate("orderedItems.productId");

    if (!order) {
      return res.json({ success: false, message: Messages.ORDER_NOTFOUND});
    }

    if (order.orderStatus === "cancelled") {
      return res.json({ success: false, message: "Order already cancelled" });
    }

    
    for (let item of order.orderedItems) {
      const product = await Product.findById(item.productId._id);
      const variant = product.variants.id(item.variantId);
      variant.stock += item.quantity;
      await product.save();
    }

    
    order.orderStatus = "cancelled";
    order.cancelReason = reason || "";
    order.cancelledAt = new Date();

    await order.save();

    res.json({ success: true });

  } catch (error) {
     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};

const returnOrder = async (req, res) => {
  try {
    const userId = req.session.user;
     const orderNumber = req.params.orderNumber;
    const { reason } = req.body;

    const order = await Order.findOne({orderNumber, userId })
      .populate("orderedItems.productId");

    if(!order) {
      return res.json({ success: false, message: Messages.ORDER_NOTFOUND })
  }
    if(order.orderStatus !== "delivered") return res.json({ success: false, message: "Only delivered orders can be returned" });
    if(order.orderStatus === "returned") return res.json({ success: false, message: "Order already returned" });

    
    for (let item of order.orderedItems) {
      const product = await Product.findById(item.productId._id);
      const variant = product.variants.id(item.variantId);
      variant.stock += item.quantity; 
      await product.save();
    }

    order.orderStatus = "returned";
    order.returnReason = reason;
    order.returnedAt = new Date();
    await order.save();

    res.json({ success: true });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};



const generateInvoice = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderNumber = req.params.orderNumber;

    const order = await Order.findOne({ orderNumber, userId })
      .populate('orderedItems.productId','product price');

    if (!order){
       return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.ORDER_NOTFOUND })
    }
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${orderNumber}.pdf`);

    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Order Number: ${order.orderNumber}`);
    doc.text(`Date: ${order.createdAt.toDateString()}`);
    doc.text(`Status: ${order.orderStatus}`);
    doc.text(`Total Amount: ₹${order.totalAmount}`);
    doc.moveDown();

    doc.text('Items:', { underline: true });
    order.orderedItems.forEach(item => {
      doc.text(`${item.productId.product} - Qty: ${item.quantity} - Price: ₹${item.purchasedPrice}`);
    });

    doc.end();
    doc.pipe(res);

  } catch (err) {
    console.error('Invoice Error:', err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });

  }
};





module.exports={
    getOrder,
    getOrderDetails,
    cancelOrder,
    returnOrder,
     generateInvoice
}