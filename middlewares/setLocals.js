const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Wishlist = require("../model/wishlistSchema"); 

module.exports = async (req, res, next) => {
  try {
    res.locals.user = null;
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;

    if (!req.session || !req.session.user) {
      return next();
    }

    const userId = req.session.user;

    
    res.locals.user = await User.findById(userId);

   
    const cart = await Cart.findOne({ userId });
    if (cart && cart.items.length > 0) {
      res.locals.cartCount = cart.items.reduce(
        (total, item) => total + item.quantity,
        0
      );
    }

    
    const wishlist = await Wishlist.findOne({ userId });

    if (wishlist && wishlist.items.length > 0) {
      res.locals.wishlistCount = wishlist.items.length;
    }

    next();
  } catch (err) {
    console.log("setLocals error:", err);
    next(err);
  }
};
