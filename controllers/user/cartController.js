const User = require("../../model/userSchema");
const Product = require("../../model/productSchema");
const Wishlist=require("../../model/wishlistSchema");
const mongodb = require("mongodb");
const Cart = require('../../model/cartSchema');
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes");

const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect('/login');
    }
const user = await User.findById(userId);
    
const cart = await Cart.findOne({ userId }).populate('items.productId');

let grandTotal = 0;

if (cart && cart.items.length > 0) {

  cart.items = cart.items.filter(item => item.productId);

  cart.items.forEach(item => {
    grandTotal += item.price * item.quantity;
  });
}

res.render('cart', {
  user,
  cart,
  grandTotal
});

  } catch (error) {
    console.error("Cart Page Error:", error);
    res.redirect('/pageNotFound');
  }
};

const addToCart=async(req,res)=>{
    try {
    const userId = req.session.user;
    const { productId, variantId } = req.body;
const user = await User.findById(userId);
    
    const product = await Product.findById(productId)
      .populate('categories');

    if (!product) {
    return res.status(StatusCodes.NOT_FOUND).json({
  success: false,
  message: Messages.PRODUCT_NOT_FOUND
});
    }
  const variant = product.variants.id(variantId);
    if (!variant ) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: Messages.VARIANT_NOTFOUD });
    }


if (!variant.isListed || variant.isDeleted) {
return res.status(StatusCodes.CONFLICT).json({
  success: false,
  message: Messages.VARIANT_UNAVAILABLE
});

}

    
    if (variant.stock <= 0) {
      return res.status(StatusCodes.CONFLICT).json({ success: false, message: Messages.OUT_OF_STOCK });
    }
    const MAX_QTY_PER_PRODUCT = 5;


    
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

  
    const itemIndex = cart.items.findIndex(
      item =>
        item.productId.toString() === productId &&
        item.variantId?.toString() === variantId
    );

    if (itemIndex > -1) {
      const currentQty = cart.items[itemIndex].quantity;

  
      if (currentQty + 1 > variant.stock) {
        return res.json({
          success: false,
          message: Messages.OUT_OF_STOCK
        });
      }

      
      if (currentQty >= MAX_QTY_PER_PRODUCT) {
       return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
  success: false,
  message: Messages.MAX_LIMIT_REACHED
});

      }

      cart.items[itemIndex].quantity += 1;
      cart.items[itemIndex].totalPrice =
        cart.items[itemIndex].quantity * cart.items[itemIndex].price;
    } else {
      
      cart.items.push({
        productId,
        variantId,
        quantity: 1,
        price: variant.price, 
        totalPrice: variant.price
      });
    }

    await cart.save();
    const wishlist = await Wishlist.findOne({ userId });

 if (wishlist) {
  wishlist.items = wishlist.items.filter(item =>
    !(
      item.productId.toString() === productId &&
      item.variantId.toString() === variantId
    )
  );

  await wishlist.save();
}


    return res.status(StatusCodes.OK).json({
      success: true,
      message: Messages.ADDED_TO_CART,
       cartCount: cart.items.reduce((t, i) => t + i.quantity, 0)
    });

    }
catch (error) {
    console.log(error)
     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         success: false,
         message: Messages.INTERNAL_SERVER_ERROR
  })
}
}
const changeQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const { cartItemId, action } = req.body;

    
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false });
    }

    
    const item = cart.items.id(cartItemId);
    if (!item) {
      return res.json({ success: false });
    }

    
    const product = await Product.findById(item.productId);
    if (!product) {
       return res.status(StatusCodes.NOT_FOUND).json({
  success: false,
  message: Messages.PRODUCT_NOT_FOUND
});
    }

    const variant = product.variants.id(item.variantId);
    if (!variant || !variant.isListed || variant.isDeleted) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: Messages.VARIANT_UNAVAILABLE
      });
    }

    const MAX_QTY_PER_PRODUCT = 5;

    
    if (action === "increment") {

      if (item.quantity + 1 > variant.stock) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: Messages.OUT_OF_STOCK
        });
      }

      if (item.quantity >= MAX_QTY_PER_PRODUCT) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: Messages.MAX_LIMIT_REACHED
        });
      }

      item.quantity += 1;
    }

    
    if (action === "decrement") {
      if (item.quantity <= 1) {
        return res.status(StatusCodes.CONFLICT).json({ success: false,message:"minimum 1 product should added " });
      }
      item.quantity -= 1;
    }

    
    item.totalPrice = item.quantity * item.price;

    await cart.save();

    res.status(StatusCodes.OK).json({
      success: true,
      quantity: item.quantity,
      totalPrice: item.totalPrice
    });

  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

const removeProduct = async (req, res) => {
  try {
    const userId = req.session.user;
    const { cartItemId } = req.body;
    console.log(cartItemId)

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: Messages.USER_NOT_FOUND });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false });
    }

    const item = cart.items.id(cartItemId);
    if (!item) {
     return res.status(StatusCodes.NOT_FOUND).json({
  success: false,
  message: Messages.ITEM_NOT_FOUND
});
    }

    
      cart.items.pull({ _id: cartItemId }); 
    await cart.save();

    res.status(StatusCodes.OK).json({ success: true, message: Messages.ITEM_REMOVED});
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR});
  }
};




module.exports={
    getCartPage,
    addToCart,
    changeQuantity,
    removeProduct
}