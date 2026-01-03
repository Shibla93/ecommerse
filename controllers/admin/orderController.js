const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");


const Brand = require("../../model/brandSchema");
const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");
const mongoose = require("mongoose");
const cloudinary = require('../../helpers/cloudinary');
const Order = require('../../model/orderSchema');


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
      filter['orderNumber'] = { $regex: search, $options: 'i' };
    }
  
    if (statusFilter) {
  filter['orderStatus'] = statusFilter;
}

    const orders = await Order.find(filter)
      .populate('userId', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);
    
    

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
    console.error('Admin Orders Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
    
  }
};



const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    console.log("ORDER ID:", req.params.orderId);
console.log("STATUS:", req.body.status);


    const order = await Order.findById(orderId).populate('orderedItems.productId');

    if (!order) {
      return res.json({ success: false, message: Messages.ORDER_NOTFOUND });
    }

    if (status === 'shipped' && order.orderStatus !== 'shipped') {
      for (let item of order.orderedItems) {
        const product = await Product.findById(item.productId._id);
        const variant = product.variants.id(item.variantId); 
        if (variant) {
          variant.stock -= item.quantity;
          if (variant.stock < 0) variant.stock = 0;
          await product.save();
        }
      }
    }
    if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
      for (let item of order.orderedItems) {
        const product = await Product.findById(item.productId._id);
        const variant = product.variants.id(item.variantId);
        if (variant) {
          variant.stock += item.quantity;
          await product.save();
        }
      }
    }


    order.orderStatus = status;
    await order.save();

    res.json({ success: true, message: 'Order status updated' });

  } catch (error) {
    console.error('Status Update Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
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

    res.render('admin/orderDetails', { order });

  } catch (error) {
    console.error('View Order Error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });;
  }
};

module.exports = {
  listOrders,
  updateOrderStatus,
  viewOrder
};
