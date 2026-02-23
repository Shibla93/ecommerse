const User = require("../../model/userSchema");
const Address=require("../../model/addressSchema");
const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const Order = require("../../model/orderSchema");
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes");


const Wishlist = require("../../model/wishlistSchema");

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    const wishlist = await Wishlist.findOne({ userId })
      .populate("items.productId");

    res.render("wishlist", {
         wishlist
        ,user 
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(Messages.INTERNAL_SERVER_ERROR);
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId } = req.body;

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        items: [{ productId, variantId }]
      });
    } else {
      const exists = wishlist.items.find(
        item =>
          item.productId.toString() === productId &&
          item.variantId.toString() === variantId
      );

      if (exists) {
        return res.json({ success: false, message: "Already in wishlist" });
      }

      wishlist.items.push({ productId, variantId });
    }

    await wishlist.save();
    res.json({ success: true, message: "Added to wishlist" , wishlistCount: wishlist.items.length});

  } catch (err) {
    console.log(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false , message: Messages.INTERNAL_SERVER_ERROR });
  }
}

    const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { wishlistItemId } = req.body;


    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      {
        $pull: {
          
             items: { _id: wishlistItemId }
          }
        },
           { new: true }
    );

    if (!wishlist) {
      return res.json({ success: false, message: "Wishlist not found" });
    }

    res.json({ success: true, message: "Removed from wishlist" });

  } catch (err) {
    console.log(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};
const moveWishlistToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { wishlistItemId, productId, variantId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please login" });
    }

    // 🔍 Get product & variant
    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.json({ success: false, message: "Variant not found" });
    }

    const price = variant.price;
    const qty = quantity || 1;
    const totalPrice = price * qty;

    
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }


    const existingItem = cart.items.find(
      item =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId
    );

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.totalPrice = existingItem.quantity * existingItem.price;
    } else {
      cart.items.push({
        productId,
        variantId,
        quantity: qty,
        price,
        totalPrice
      });
    }

    await cart.save();

    
    await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { _id: wishlistItemId } } }
    );

    res.json({
      success: true,
      message: "Moved to cart successfully"
    });

  } catch (error) {
    console.error("Move Wishlist Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false , message: Messages.INTERNAL_SERVER_ERROR });
  }
};


module.exports = {
  getWishlist,
  addToWishlist,
removeFromWishlist,
 moveWishlistToCart
};  