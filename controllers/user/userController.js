import User from "../../model/userSchema.js";
import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
import bcrypt from "bcrypt";
import Wishlist from "../../model/wishlistSchema.js";
import Brand from "../../model/brandSchema.js";
import Category from "../../model/categorySchema.js";
import Wallet from "../../model/walletSchema.js";
import Product from "../../model/productSchema.js";
import mongoose from "mongoose";
import cloudinary from "../../helpers/cloudinary.js";


const pageNotFound=async(req,res)=>{
    try{
        res.status(404).render("error")
    }catch(error){
        res.status(500).send("Internal Server Error")
    }
}




const generateReferralCode = async (name) => {
  let code;
  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    code = name.slice(0,2).toUpperCase() + random;

    const user = await User.findOne({ referralCode: code });
    if (!user) exists = false;
  }

  return code;
};
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email, 
      subject: "Verify your account",
      text:`Your OTP is ${otp}`,
      html:`<b>Your OTP: ${otp}</b>`
    });

    console.log(" Message ID:", info.messageId);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// 
const home = async (req, res) => {
  try {
   
    let userData = null;
    const userId = req.session.user;
    if (userId) {
      userData = await User.findById(userId).lean();
    }
let wishlistItems = [];

if (userId) {
  const wishlist = await Wishlist.findOne({ userId });
  if (wishlist) {
    wishlistItems = wishlist.items.map(item => String(item.productId));
  }
}
    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

  
    let products = await Product.find({ "variants.isDeleted": false, "variants.isListed": true })
      .populate("brand")
      .populate("category")
      .sort({ createdAt: -1 })
      .lean();

    
    products = products.filter(p => {
      if (!p.brand || p.brand.isBlocked) return false;

     if (!p.category || !p.category.isListed) return false;


      
      const validVariants = p.variants.filter(v => !v.isDeleted && v.isListed);
      if (validVariants.length === 0) return false;

      p.variants = [validVariants[0]]; 
      p.displayImage = validVariants[0].images.length > 0 
        ? (validVariants[0].images[0].croppedUrl || validVariants[0].images[0].originalUrl)
        : null;
      p.displayPrice = validVariants[0].price;

      return true;
    });

    const productLimit = products.slice(0, 4);

    res.render("home", {
      user: userData,
      products: productLimit,
      categories,
      brands,
    wishlistItems
    });
  } catch (error) {
    console.error("Home controller error:", error);
     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
  }
};

const signup=async(req,res)=>{
    try {
        res.render("signup")
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
    }
}

const postSignup=async(req,res)=>{
    try{
    
    const {name,email,phone,password,confirmpassword,referralCode}=req.body;
    const user=await User.findOne({email})
   
    if(user){
   return res.render("signup",{error:Messages.INVALID_EMAIL,
      formData: req.body
   })
    }

    if(password!==confirmpassword){
         return res.render("signup",{error:Messages.INVALID_PASSWORD,
            formData: req.body
         })
    }

 const otp=generateOtp();
const otpExpiry = Date.now() + 2 * 60 * 1000;
 const emailSent=await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.render( "signup",{error: Messages.INTERNAL_SERVER_ERROR })
        }

 
 let referredByUser = null;
if(referralCode){
    referredByUser = await User.findOne({ referralCode: referralCode });

    if(!referredByUser){
        return res.render("signup",{
            error: "Invalid referral code",
            formData: req.body
        });
    }
}
         req.session.userOtp=otp;
         req.session.otpExpiry = otpExpiry;
         req.session.userData={name,phone,email,password,referredBy: referredByUser ? referredByUser._id : null};
         console.log(" OTP saved in session:", req.session.userOtp); 
         console.log("Session full data:", req.session);
          res.render("verify-otp");
         console.log("OTP:",otp)


    }catch(error){
    
    console.error("signup error:",error)
    res.status(500).send("Internal Server Error")
}
    }
   

const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
  }

const verifyOtp=async(req,res)=>{
    try {
       const error = req.session.errorMessage;
  const success = req.session.successMessage;

  req.session.errorMessage = null;
  req.session.successMessage = null;
      
        return res.render("verify-otp", { error ,success});

    } catch (error) {
         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
    }
}



// const postOtp=async(req,res)=>{
  
//     const {otp}=req.body;
//   if(!req.session.otpExpiry || Date.now() > req.session.otpExpiry){
//     return res.render("verify-otp", { error: Messages.OTP_EXPIRED});
//   }


//   if(otp!==req.session.userOtp){
//     return res.render("verify-otp", { error:Messages.OTP_INVALID });

//   }

//   if (otp === req.session.userOtp) {
//     const { name, phone, email, password ,referredBy} = req.session.userData;
//     const hashedPassword = await securePassword(password);
//     const newUser = new User({ name, phone, email, password:hashedPassword, referralCode: generateReferralCode(name),
//     referredBy: referredBy || null});
//     await newUser.save();
// if (referredBy) {
//       const refUser = await User.findById(referredBy);
//       if (refUser) {
//         refUser.rewards = refUser.referralRewards || [];
//         refUser.rewards.push({ type: 'referral', amount: 100, redeemed: false });
//         await refUser.save();
//       }
//     }
//   req.session.userOtp = null;
// req.session.otpExpiry = null;
// req.session.userData = null;


//    return res.render("login",{success:Messages.ACCOUNT_CREATED});
//   } else {
//     return res.render("verify-otp", { error:Messages.OTP_INVALID });
//    }
// };
 
const postOtp=async(req,res)=>{
  try {

    const {otp}=req.body;

    if(!req.session.userData){
      console.log("Session expired");
      return res.redirect("/signup");
    }

    if(!req.session.otpExpiry || Date.now() > req.session.otpExpiry){
      req.session.errorMessage = Messages.OTP_EXPIRED;
  return res.redirect("/verifyOtp");;
    }

    if(otp!==req.session.userOtp){
        req.session.errorMessage = Messages.OTP_INVALID;
  return res.redirect("/verifyOtp");
    }

    const { name, phone, email, password ,referredBy} = req.session.userData;

    if(!password){
       req.session.errorMessage = "Password missing";
  return res.redirect("/verifyOtp");
    }

    const hashedPassword = await securePassword(password);

    const newUser = new User({
      name,
      phone,
      email,
      password:hashedPassword,
      referralCode:await generateReferralCode(name),
      referredBy: referredBy || null
    });

    try {
      await newUser.save();
   if (referredBy) {
  const refUser = await User.findById(referredBy);

  if (!refUser) return;

  if (refUser ) {

    let wallet = await Wallet.findOne({ userId: refUser._id });

    if (!wallet) {
      wallet = new Wallet({
        userId: refUser._id,
        balance: 0,
        transactions: []
      });
    }

    wallet.balance += 100;

    wallet.transactions.push({
      type: "credit",
      amount: 100,
      reason: "Referral bonus"
    });

    await wallet.save();

    
  }
}

    } catch (err) {
      console.log("User save error:", err);
      return res.status(500).send("DB Error");
    }

    req.session.userOtp = null;
    req.session.otpExpiry = null;
    req.session.userData = null;

    // return res.render("login",{success:Messages.ACCOUNT_CREATED});
    req.session.successMessage = Messages.ACCOUNT_CREATED;
return res.redirect("/login");

  } catch (error) {
    console.log("postOtp error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
const resendOtp=async(req,res)=>{
    try{
      if(!req.session.userData){
  return res.status(400).json({success:false,message:"Session expired"});
}
        const {email}=req.session.userData;
        if(!email){
            return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:Messages.EMAIL_NOT_FOUND,})
        }
        const otp=generateOtp();
        const otpExpiry = Date.now() + 2* 60 * 1000;
        req.session.userOtp=otp;
        req.session.otpExpiry = otpExpiry;

       console.log("OTP saved in session:", req.session.userOtp);

        const emailSent=await sendVerificationEmail(email,otp);
      if(emailSent){
        console.log("Resend OTP:",otp);
        res.status(StatusCodes.OK).json({success:true,message:Messages.OTP_RESENT_SUCCESS})
       }else{
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:Messages.INTERNAL_SERVER_ERROR})
       }
    
    }catch(error){
res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: Messages.INTERNAL_SERVER_ERROR,
    })
    }
}



// const loadLogin=async(req,res)=>{
//     try {
//       if (req.isAuthenticated()) {
//     return res.redirect("/home");
//   }
//   res.render("login");
//     } catch (error) {
//         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
//     }
// }
const loadLogin = async (req, res) => {
  try {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.redirect("/home");
    }

    const error = req.session.errorMessage;
     const success = req.session.successMessage;
    const email = req.session.oldEmail;

    
    req.session.errorMessage = null;
   req.session.successMessage = null;
    req.session.oldEmail = null;

    res.render("login", { error,success, email });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

// const login=async(req,res)=>{
//     try {
//         const {email,password}=req.body;
//         const findUser=await User.findOne({email})
//          if (!findUser) {
//         return res.render("login", { error: Messages.USER_NOT_FOUND ,
//           email:email
//         });


//     }

//     if (findUser.isBlocked) {
//       return res.render("login", { error: Messages.USER_BLOCKED,
//         email:email
//        });
//     }

//     if (!password || !findUser.password) {
//       return res.status(StatusCodes.BAD_REQUEST).render("login", {
//         error: Messages.INVALID_CREDENTIALS ,
//         email:email
//       });
//     }

//     const passwordMatch = await bcrypt.compare(password, findUser.password);
//     if (!passwordMatch) {
//       return res.status(StatusCodes.UNAUTHORIZED).render("login", {
//         error: Messages.INVALID_PASSWORD,
//         email:email
//     })

//     } 
//     req.session.user = findUser._id;
//     return res.redirect("/home");

// }catch (error) {
//          console.error("Login error", error);
//     return res.status(StatusCodes.INTERNAL_SERVER_ERROR).render("login", {
//       error: Messages.INTERNAL_SERVER_ERROR,
//   })

//     }
// }
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ email });

    if (!findUser) {
      req.session.errorMessage = Messages.USER_NOT_FOUND;
      req.session.oldEmail = email;
      return res.redirect("/login");
    }

    if (findUser.isBlocked) {
      req.session.errorMessage = Messages.USER_BLOCKED;
      req.session.oldEmail = email;
      return res.redirect("/login");
    }

    if (!password || !findUser.password) {
      req.session.errorMessage = Messages.INVALID_CREDENTIALS;
      req.session.oldEmail = email;
      return res.redirect("/login");
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      req.session.errorMessage = Messages.INVALID_PASSWORD;
      req.session.oldEmail = email;
      return res.redirect("/login");
    }
req.session.admin = null; 
    req.session.user = findUser._id;

      return req.session.save(() => res.redirect("/home"));

  } catch (error) {
    console.error("Login error", error);

    req.session.errorMessage = Messages.INTERNAL_SERVER_ERROR;
    return res.redirect("/login");
  }
};
const logout=async (req,res)=>{
  try {
    req.session.destroy((err)=>{
      
      if(err){
        console.log("session destruction error",err.message)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:Messages.INTERNAL_SERVER_ERROR})
      }
      return res.redirect("/login")
    })
  } catch (error) {
    console.log("logout error",error.message)
 res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({success:false,message:Messages.INTERNAL_SERVER_ERROR})
  }
}


const userController={
    home,
    pageNotFound,
    signup,
    postSignup,
    verifyOtp,
    postOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
   
    
    
}
export default userController