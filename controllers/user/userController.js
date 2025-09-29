
const User=require("../../model/userSchema")
const env=require("dotenv").config()
const nodemailer=require("nodemailer")

const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");
const bcrypt = require("bcrypt");


const pageNotFound=async(req,res)=>{
    try{
        res.render("error")
    }catch(error){
        res.redirect("/pageNotFound")
    }
}


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

const home=async(req,res)=>{
    try {
      const userId=req.session.user;
      if(userId){
        const userData=await User.findOne({_id:userId})
        return res.render("home",{user:userData})
      }else{
        return res.render('home')
      }
        
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
    }
}

const signup=async(req,res)=>{
    try {
        res.render("signup")
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
    }
}

const postSignup=async(req,res)=>{
    try{
    
    const {name,email,phone,password,confirmpassword}=req.body;
    const user=await User.findOne({email})
   
    if(user){
   return res.render("signup",{error:Messages.INVALID_EMAIL})
    }

    if(password!==confirmpassword){
         return res.render("signup",{error:Messages.INVALID_PASSWORD})
    }

 const otp=generateOtp();
 const otpExpiry = Date.now() + 60000;
 const emailSent=await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.render( "signup",{error: Messages.INTERNAL_SERVER_ERROR })
        }

 
 
         req.session.userOtp=otp;
         req.session.otpExpiry = otpExpiry;
         req.session.userData={name,phone,email,password};
         console.log(" OTP saved in session:", req.session.userOtp); 
          res.render("verify-otp");
         console.log("OTP:",otp)


    }catch(error){
        console.error("signup error:",error)
        res.redirect("/pageNotFound")
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
        return res.render("verify-otp");

    } catch (error) {
         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
    }
}



const postOtp=async(req,res)=>{
  
    const {otp}=req.body;
   if(Date.now()>req.session.otpExpiry){
    return res.render("verify-otp", { error: Messages.OTP_EXPIRED});
  }


  if(otp!==req.session.userOtp){
    return res.render("verify-otp", { error:Messages.OTP_INVALID });

  }

  if (otp === req.session.userOtp) {
    const { name, phone, email, password } = req.session.userData;
    const hashedPassword = await securePassword(password);
    const newUser = new User({ name, phone, email, password:hashedPassword});
    await newUser.save();


   return res.render("login",{success:Messages.ACCOUNT_CREATED});
  } else {
    return res.render("verify-otp", { error:Messages.OTP_INVALID });
   }
};
  
const resendOtp=async(req,res)=>{
    try{
        const {email}=req.session.userData;
        if(!email){
            return res.status(StatusCodes.BAD_REQUEST).json({success:false,message:Messages.EMAIL_NOT_FOUND,})
        }
        const otp=generateOtp();
         const otpExpiry = Date.now() + 60000;
        req.session.userOtp=otp;
        req.session.otpExpiry = otpExpiry;

       console.log("OTP saved in session:", req.session.otp);

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



const loadLogin=async(req,res)=>{
    try {
        res.render("login")
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:Messages.INTERNAL_SERVER_ERROR})
    }
}


const login=async(req,res)=>{
    try {
        const {email,password}=req.body;
        const findUser=await User.findOne({email})
         if (!findUser) {
        return res.render("login", { error: Messages.USER_NOT_FOUND });


    }

    if (findUser.isBlocked) {
      return res.render("login", { error: Messages.USER_BLOCKED });
    }

    if (!password || !findUser.password) {
      return res.status(StatusCodes.BAD_REQUEST).render("login", {
        error: Messages.INVALID_CREDENTIALS });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).render("login", {
        error: Messages.INVALID_PASSWORD,
    })

    } 
    req.session.user = findUser._id;
    return res.redirect("/home");

}catch (error) {
         console.error("Login error", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).render("login", {
      error: Messages.INTERNAL_SERVER_ERROR,
  })

    }
}

const logout=async (req,res)=>{
  try {
    req.session.destroy((err)=>{
      if(err){
        console.log("session destruction error",err.message)
        res.redirect("/pageNotFound")
      }
      return res.redirect("/login")
    })
  } catch (error) {
    console.log("logout error",error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect("/pageNotFound")
  }
}








module.exports={
    home,
    pageNotFound,
    signup,
    postSignup,
    verifyOtp,
    postOtp,
    resendOtp,
    loadLogin,
    login,
    logout
    
}