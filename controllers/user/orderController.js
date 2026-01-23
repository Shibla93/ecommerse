const User = require("../../model/userSchema");
const Address=require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes");
const { getDisplayStatus } = require("../../helpers/displayStatus");

const PDFDocument = require('pdfkit');

const getOrder = async (req, res) => {
  try {
    const userId = req.session.user;
console.log("USER", userId);

    if (!userId) 
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: Messages.USER_NOT_FOUND });
   const user = await User.findById(userId);
   const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    let filter = {};
    const search= req.query.search || "";
    const statusFilter = req.query.status || '';
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    if(search) {
      filter.orderNumber = { $regex: search, $options: 'i' };
    }
  
    if (statusFilter) {
  filter.orderStatus= statusFilter;
}


    const orders = await Order.find({
  userId,
  ...(search && { orderNumber: { $regex: search, $options: "i" } })
})
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
  order.finalTotal = totalAmount;
});

    
        const totalOrders =  await Order.countDocuments({
  userId,
  ...(search && { orderNumber: { $regex: search, $options: "i" } }),
  ...(statusFilter && { orderStatus: statusFilter })
});

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
    let subTotal = 0;

order.orderedItems.forEach(item => {
  if (!["cancelled", "returned"].includes(item.itemStatus)) {
    subTotal += item.purchasedPrice * item.quantity;
    
  }
});

    const tax = subTotal * 0.05; 

const shipping = subTotal > 0 ? order.shippingCharge : 0;
const discount = order.discount || 0;

const finalTotal = subTotal + tax + shipping - discount;

    res.render("user/order-details", {
      order,
      user,
    subTotal,
      tax,
      finalTotal
    });

  } catch (error) {
    console.log(error)
    res.redirect("/pageNotFound");
  }
};

const cancelOrder= async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderNumber, itemId } = req.params;
    const { reason } = req.body;
    console.log("ITEM ID:", itemId);

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
      return res.status(404).json({
        success: false,
        message: "Item not found"
      });
    }
console.log("ITEM ID:", itemId);
console.log("FOUND ITEM:", item)
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

if (activeItems.length === 0) {
  order.orderStatus = "cancelled";
}


await order.save();

    res.json({
      success: true,
      message: "Product cancelled successfully"
    });

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
        message: "Item not found"
      });
    }

  
    if (item.itemStatus !== "delivered") {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: Messages.RETURN_NOT_ALLOWED
      });
    }

    const product = await Product.findById(item.productId._id);
    const variant = product.variants.id(item.variantId);
    variant.stock += item.quantity;
    await product.save();

  
    item.itemStatus = "returned";
item.return = {
  isReturned: true,
  reason,
  returnedAt: new Date()
};

const activeItems = order.orderedItems.filter(
  i => !["cancelled", "returned"].includes(i.itemStatus)
);

if (activeItems.length === 0) {
  order.orderStatus = "returned";
}


    await order.save();

    res.json({
      success: true,
      message: "Product returned successfully"
    });

  } catch (error) {
    console.error("Return Item Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderNumber = req.params.orderNumber;

    const order = await Order.findOne({ orderNumber, userId })
      .populate("orderedItems.productId", "product variants");

    if (!order) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: Messages.ORDER_NOTFOUND
      });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice-${orderNumber}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(22).text("Tax Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Order Number: ${order.orderNumber}`);
    doc.text(`Order Date: ${order.createdAt.toDateString()}`);
    doc.moveDown();

    doc.fontSize(13).text("Items", { underline: true });
    doc.moveDown(0.5);

    let subTotal = 0;

    order.orderedItems.forEach((item, index) => {
      let lineTotal = 0;


      if (!["cancelled", "returned"].includes(item.itemStatus)) {
        lineTotal = item.purchasedPrice * item.quantity;
        subTotal += lineTotal;
      }

      doc.fontSize(11).text(
        `${index + 1}. ${item.productId.product}
Qty: ${item.quantity}
Status: ${item.itemStatus}
Price: ₹${item.purchasedPrice}
Line Total: ₹${lineTotal}`
      );

      doc.moveDown(0.8);
    });

  
    const TAX_RATE = 0.08; 
    const tax = parseFloat((subTotal * TAX_RATE).toFixed(2));
    const shipping = subTotal > 0 ? order.shippingCharge : 0;
    const discount = order.discount || 0;
    const finalTotal = subTotal + tax + shipping - discount;

    doc.moveDown();
    doc.fontSize(12).text(`Subtotal: ₹${subTotal}`, { align: "right" });
    doc.text(`Tax (8%): ₹${tax}`, { align: "right" });
    doc.text(`Shipping: ₹${shipping}`, { align: "right" });
    doc.text(`Discount: ₹${discount}`, { align: "right" });

    doc.moveDown();
    doc.fontSize(14).text(`Grand Total: ₹${finalTotal}`, { align: "right" });

    doc.end();
  } catch (error) {
    console.error("Invoice Error:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};






module.exports={
    getOrder,
    getOrderDetails,
    cancelOrder,
    returnOrder,
     generateInvoice
}