import User from "../../model/userSchema.js";
import Product from "../../model/productSchema.js";
import Category from "../../model/categorySchema.js";
import Wishlist from "../../model/wishlistSchema.js";
import mongodb from "mongodb";
import Cart from "../../model/cartSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
// const getCartPage = async (req, res) => {
//   try {
//     const userId = req.session.user;

//     if (!userId) {
//       return res.redirect('/login');
//     }
// const user = await User.findById(userId);
    
// const cart = await Cart.findOne({ userId }).populate({
//   path: "items.productId",
//   populate: {
//     path: "category"
//   }
// });

// let grandTotal = 0;
//    let shipping = 0;

// if (cart && cart.items.length > 0) {

//   cart.items = cart.items.filter(item => item.productId);

//   cart.items.forEach(item => {
//             const product = item.productId;

//         const variant = product.variants.find(
//           v => v._id.toString() === item.variantId.toString()
//         );

//         if (!variant) return;

//         const maxOffer = Math.max(
//           product.productOffer || 0,
//           product.category?.categoryOffer || 0
//         );

//         const discount = variant.price * (maxOffer / 100);
//         const finalPrice = Math.round(variant.price - discount);

//         item.price = finalPrice;
//         item.totalPrice = finalPrice * item.quantity;

    
  
//         grandTotal += item.totalPrice;

   
//   });
//   if (grandTotal < 2500) {
//     shipping = 50;
//   }

  
//   grandTotal += shipping;
// }

// res.render('cart', {
//   user,
//   cart,
//   grandTotal,
//   shipping
// });

//   } catch (error) {
//     console.error("Cart Page Error:", error);
//     res.redirect('/pageNotFound');
//   }
// };
const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId);

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: {
        path: "category"
      }
    });

    let grandTotal = 0;
    let shipping = 0;
    let messages = [];

    if (cart && cart.items.length > 0) {

      
      cart.items.forEach(item => {
  const product = item.productId;

  if (!product) {
    item.isUnavailable = true;
    messages.push("Some products are no longer available");
    return;
  }

  const variant = product.variants.find(
    v => v._id.toString() === item.variantId.toString()
  );

  if (!variant || !variant.isListed || variant.isDeleted) {
    item.isUnavailable = true;
    messages.push(`${product.product} is currently unavailable`);
    return;
  }

  item.isUnavailable = false;

  const maxOffer = Math.max(
    product.productOffer || 0,
    product.category?.categoryOffer || 0
  );

  const discount = variant.price * (maxOffer / 100);
  const finalPrice = Math.round(variant.price - discount);

  item.price = finalPrice;

  if (item.quantity > variant.stock) {
    item.quantity = variant.stock;
    messages.push(`${product.product} quantity reduced due to stock limit`);
  }

  item.totalPrice = item.price * item.quantity;

  grandTotal += item.totalPrice;
});

    
      
    }

    res.render('cart', {
      user,
      cart,
      grandTotal,
      shipping,
      messages
    });

  } catch (error) {
    console.error("Cart Page Error:", error);
    res.redirect('/pageNotFound');
  }
};


const addToCart=async(req,res)=>{
    try {
    const userId = req.session.user;
    if (!req.session.user) {
  return res.status(401).json({
    success: false,
    redirect: "/login"
  });
}
    const { productId, variantId } = req.body;
 
    const product = await Product.findById(productId)
      .populate('category');

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
if (product.isBlocked) {
  return res.status(StatusCodes.CONFLICT).json({
    success: false,
    message: "This product is currently unavailable"
  });
}
const maxOffer = Math.max(
  product.productOffer || 0,
  product.category.categoryOffer || 0
);

const discount = variant.price * (maxOffer / 100);
const finalPrice = Math.round(variant.price - discount);
    
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
        price: finalPrice,
  totalPrice: finalPrice
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
      return res.status(StatusCodes.NOT_FOUND).json({
  success: false,
  message: "Cart not found"
});
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
        return res.status(StatusCodes.CONFLICT).json({ success: false,message:"Minimum quantity is 1 " });
      }
      item.quantity -= 1;
    }

    
    item.totalPrice = item.quantity * item.price;

    await cart.save();

    res.status(StatusCodes.OK).json({
      success: true,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
        cartCount: cart.items.reduce((t, i) => t + i.quantity, 0)
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
      return res.status(StatusCodes.NOT_FOUND).json({
  success: false,
  message: "Cart not found"
});
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




const cartController={
    getCartPage,
    addToCart,
    changeQuantity,
    removeProduct
}
export default cartController