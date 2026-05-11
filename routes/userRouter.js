
const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController")
const upload = require('../helpers/multer'); 

const passport = require("passport");
const {userAuth}=require("../middlewares/auth")
const profileController=require("../controllers/user/profileController")
const productController=require("../controllers/user/productController")


router.get("/pageNotfound",userController.pageNotFound)


router.get("/",userController.home)
router.get("/signup",userController.signup)
router.post("/signup",userController.postSignup)
router.get("/verifyOtp",userController.verifyOtp)
router.post("/verifyOtp",userController.postOtp)
router.post("/resendotp",userController.resendOtp)

const preventLogin = require('../middlewares/preventLogin');

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

router.get("/home",userAuth, userController.home);

router.get("/logout",userController.logout)
router.post("/logout",userController.logout)






router.get("/forgotpass", profileController.getForgotPass);
router.post("/forgotpass", profileController.postEmail);
router.get("/forgotverify", profileController.getForgotVerify); 
router.post("/forgotverify", profileController.postForgotOtp);
router.post("/resendForgotOtp", profileController.resendForgotOtp);
router.post("/reset-Newpass", profileController.newPass)
router.get("/userProfile",userAuth,profileController.userProfile);
router.post("/userprofile",userAuth,upload.single('profileImage'),profileController.updateProfile)
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp);
router.post("/update-email",userAuth,profileController.updateEmail)
router.post("/update-profile",userAuth,profileController.updateProfile)
router.get('/change-password',userAuth, profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp)





router.get("/shop",userAuth,productController.loadShoppingPage)
router.get("/product/:id",userAuth,productController.loadProductDetail)
router.post("/product/:id/review",userAuth,productController.addReview)














module.exports = router;
