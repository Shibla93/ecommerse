import express from "express";
const router = express.Router();

import userController from "../controllers/user/userController.js";
import upload from "../helpers/multer.js";

import passport from "passport";
import { userAuth } from "../middlewares/auth.js";

import * as profileController from "../controllers/user/profileController.js";
import productController from "../controllers/user/productController.js";
import addressController from "../controllers/user/addressController.js";
import cartController from "../controllers/user/cartController.js";
import checkoutController from "../controllers/user/checkoutController.js";
import orderController from "../controllers/user/orderController.js";
import wishlistController from "../controllers/user/wishlistController.js";
import paymentController from "../controllers/user/paymentController.js";
import walletController from "../controllers/user/walletController.js";
import couponController from "../controllers/user/couponController.js";

import cloudinary from "../helpers/cloudinary.js";

router.get("/pageNotfound",userController.pageNotFound)


router.get("/",userController.home)
router.get("/signup",userController.signup)
router.post("/signup",userController.postSignup)
router.get("/verifyOtp",userController.verifyOtp)
router.post("/verifyOtp",userController.postOtp)
router.post("/resendotp",userController.resendOtp)

import { preventLogin } from '../middlewares/preventLogin.js'

router.get('/login', preventLogin, userController.loadLogin);

router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] ,  prompt: 'select_account'})
);
//google authentication
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    console.log("Google login successful. User:", req.user);
    req.session.user = req.user._id; 
    res.redirect("/");
  }
);


// router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/home", userController.home);
router.get("/logout",userController.logout)
router.post("/logout",userController.logout)

router.get("/forgotpass", profileController.getForgotPass);
router.post("/forgotpass", profileController.postEmail);
router.get("/forgotverify", profileController.getForgotVerify); 
router.post("/forgotverify", profileController.postForgotOtp);
router.post("/resendForgotOtp", profileController.resendForgotOtp);
router.get("/reset-Newpass", profileController.getResetPassword);
router.post("/reset-Newpass", profileController.newPass)
console.log(profileController);
router.get("/userProfile",userAuth,profileController.userProfile);
router.post("/userProfile",userAuth,upload.single('profileImage'),profileController.updateProfile)
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/resend-change-email-otp", userAuth,profileController.resendChangeEmailOtp);
router.get("/new-email", userAuth, profileController.getNewEmailPage);
router.post("/update-email",userAuth,profileController.updateEmail)
router.post('/change-password',userAuth, profileController.changePassword);

router.get("/address",userAuth,addressController.getAddress)
 router.get("/addAddress",userAuth,addressController.addAddress)
 router.post("/addAddress",userAuth,addressController.postAddAddress);
 router.get("/editAddress/:id",userAuth,addressController.editAddress)
 router.patch("/editAddress/:id",userAuth,addressController.postEditAddress)
router.delete("/deleteAddress/:id",userAuth,addressController.deleteAddress)

router.get("/shop",productController.loadShoppingPage)
router.get("/product/:id",productController.loadProductDetail)
router.post("/product/:id/review",userAuth,productController.addReview)
router.post("/check-variant-status",userAuth,productController.checkVariantStatus);

router.get("/wishlist", userAuth, wishlistController.getWishlist);
 router.post("/wishlist/add", userAuth, wishlistController.addToWishlist);
 router.post("/wishlist/remove", userAuth, wishlistController.removeFromWishlist);
 router.post("/wishlist/move-to-cart", userAuth, wishlistController.moveWishlistToCart);

router.get("/cart", userAuth, cartController.getCartPage)
 router.post("/addToCart",userAuth, cartController.addToCart)
 router.post("/changeQuantity", userAuth,cartController.changeQuantity)
router.post("/cart/remove", userAuth, cartController.removeProduct)
router.get("/checkout/validate",userAuth,checkoutController.validateCheckout);
router.get("/checkout", userAuth, checkoutController.getCheckoutPage);
router.post("/checkout/placeOrder", userAuth,checkoutController.placeOrder);
router.post("/apply-coupon", userAuth,checkoutController.applyCoupon);
router.post("/remove-coupon", userAuth,checkoutController.removeCoupon);
router.post("/payment/razorpay/create-order",userAuth,paymentController.createRazorpayOrder);
router.post("/payment/razorpay/verify",userAuth,paymentController.verifyRazorpayPayment);

router.get("/order/failure/:orderId",userAuth,orderController.orderFailurePage)
router.get("/order/success/:orderId", userAuth, orderController.orderSuccessPage);
router.post("/payment/razorpay/failed",userAuth,paymentController.markPaymentFailed);
router.patch("/order/cancel-full/:orderNumber",userAuth, orderController.cancelFullOrder);

router.get("/orders",userAuth,orderController.getOrder)
router.get("/orders/:orderId",userAuth,orderController.getOrderDetails)
router.patch("/order/item/cancel/:orderNumber/:itemId",userAuth,orderController.cancelOrder);
router.patch("/order/item/return/:orderNumber/:itemId", userAuth, orderController.returnOrder);
router.get('/order/invoice/:orderNumber', userAuth, orderController.generateInvoice);

router.get("/wallet",userAuth,walletController.getWallet)
router.get("/coupon",userAuth,couponController.getCoupens)

router.get("/form",userController.getform)
router.post("/form", upload.any(), userController.postform);
















export default router
