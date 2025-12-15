const User = require("../../model/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");
const bcrypt = require("bcrypt");

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
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`
    });

    console.log("Message ID:", info.messageId);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

const securePassword = async (password) => {
  return await bcrypt.hash(password, 10);
};



const getForgotPass = async (req, res) => {
  try {
    res.render("user/forgot_pass");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const postEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) 
      return res.render("user/forgot_pass", { error: Messages.USER_NOT_FOUND });

    const otp = generateOtp();
    req.session.forgotOtp = otp;
    req.session.forgotOtpExpiry = Date.now() + 1* 60 * 1000;
    req.session.resetEmail = email;

    const sent = await sendVerificationEmail(email, otp);
    if (!sent) return res.render("user/forgot_pass", { error: "Failed to send OTP" });

    console.log("Generated OTP:", otp);
    res.render("forgotverify_otp");
  } catch (error) {
    console.error("Error in postEmail:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
};


const getForgotVerify = async (req, res) => {
  try {
    res.render("forgotverify_otp");
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
};

const postForgotOtp = async (req, res) => {
  const { otp } = req.body;

  if (!req.session.forgotOtp || Date.now() > req.session.forgotOtpExpiry)
    return res.render("forgotverify_otp", { error: Messages.OTP_EXPIRED });

  if (otp !== req.session.forgotOtp)
    return res.render("forgotverify_otp", { error: Messages.OTP_INVALID });

  res.render("reset_pass",{success:Messages.OTP_VERIFIED});
};


const resendForgotOtp = async (req, res) => {
  try {
    const email = req.session.resetEmail;
    if (!email) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: Messages.EMAIL_NOT_FOUND });

    const otp = generateOtp();
    req.session.forgotOtp = otp;
    req.session.forgotOtpExpiry = Date.now() + 5 * 60 * 1000;

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resent OTP:", otp);
      res.status(StatusCodes.OK).json({ success: true, message: Messages.OTP_RESENT_SUCCESS });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
    }
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};


const newPass = async (req, res) => {
  try {
    const { p1, p2 } = req.body;
    const email = req.session.resetEmail;

    if (!email) return res.redirect("/forgotpass");

    if (p1 !== p2) 
      return res.render("reset_pass", { error: Messages.PASSWORDS_DO_NOT_MATCH});

    const user = await User.findOne({ email });
    const isSameAsOld = await bcrypt.compare(p1, user.password);

    if (isSameAsOld){
      return res.render("reset_pass", { error: "This is your old password. Please choose a new one." });
    }
    const passwordHash = await securePassword(p1);
    await User.updateOne({ email }, { $set: { password: passwordHash } });

    req.session.destroy();
    res.render("login", { success: "New password created successfully! Redirecting to login..." });

  } catch (error) {
   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: Messages.INTERNAL_SERVER_ERROR });
  }
};


const userProfile=async(req,res)=>{
    try{
const userId=req.session.user;
const userData=await User.findById(userId);

res.render('profile',{
  user:userData,
    activePage: "profile"
});
    }catch(error){
        console.error("Error for retreive profile data ",error);
        res.redirect("/pageNotFound")
    }
}
const updateProfile = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const userId = req.session.user._id;
    const { phone } = req.body;

    const user = await User.findById(userId);
    if (!user) 
      return res.redirect("/login");

    let imageUrl = user.profileImage;
    let publicId = user.cloudinaryPublicId;

  
    if (req.file) {
      
      if (user.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(user.cloudinaryPublicId);
      }

    
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        { folder: "profile_images" }
      );

      imageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }


    user.phone = phone;
    if (req.file) {
  user.profileImage = imageUrl;
  user.cloudinaryPublicId = publicId;
  user.hasCustomImage = true;
}
    

    await user.save();

    
    req.session.user = user;

    res.redirect("/userprofile?success=true");

  } catch (err) {
    console.error("Profile update error:", err);
    res.redirect("/userprofile?error=true");
  }
};



 const changeEmail = async(req, res) => {
    try{
      const userId=req.session.user;
      const userData=await User.findById(userId);

     res.render("user/change-email",{
         user:userData
     });
 }catch(error){
    res.redirect("/pageNotFound")
 }
}


const changeEmailValid=async(req,res)=>{
try {
    const {email}=req.body;
    

    const userExist=await User.findOne({email});
    if(userExist){
        const otp=generateOtp();
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            req.session.userOtp=otp;
            req.session.userData=req.body;
            req.session.email=email;
            res.render("change-email-otp");
            console.log("email sent:",email);
            console.log("otp:",otp);
            
            

        }else{
            res.json("email-error")
        }
    }else{
        res.render("change-email",{
            message:Messages.USER_NOT_FOUND
        })
    }
} catch (error) {
    res.redirect("/pageNotFound")
}
}


// Handle OTP verification
const verifyEmailOtp = async (req, res) => {
    try {
         const enteredOtp = req.body.otp;


        if (enteredOtp === req.session.userOtp) {
            const userData = req.session.userData;
           res.render("new-email",{

           })
        
            
        } else {
            res.render("change-email-otp", { message: Messages.INVALID_OTP , userData:req.session.userData});

        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
};

const updateEmail=async(req,res)=>{
    try{
    const newEmail=req.body.newEmail;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId,{email:newEmail});
    res.redirect("/userProfile")
}catch(error){
res.redirect("/pageNotFound")
}
}

// const updateProfile = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const { phone } = req.body;

//         await User.findByIdAndUpdate(userId, { phone });

//         res.json({ success: true, message: Messages.PROFILE_UPDATED });
//     } catch (error) {
//         console.error("Error updating profile:", error);
//        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
//     }
// };
const changePassword=async(req,res)=>{
    try{
res.render("change password")
    }catch(error){
        res.redirect("/pageNotFound")
    }
}

 const changePasswordValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userExist = await User.findOne({ email });

        if (userExist) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);

            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;

                res.render("change-password-otp");
                console.log("OTP:", otp);
            } else {
                res.json({
                    success: false,
                    message: Messages.FAILED_OTP,
                });
            }
        } else {
            res.render("change password", {
                message: Messages.USER_NOT_FOUND,
            });
        }
    } catch (error) {
        console.log("Error in change password validation", error);
        res.redirect("/pageNotFound");
    }
};

const verifyChangePassOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:Messages.OTP_INVALID})
        }
    } catch (error) {
       res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
    }
}




module.exports = {
  getForgotPass,
  postEmail,
  getForgotVerify,
  postForgotOtp,
  resendForgotOtp,
  newPass,
  updateProfile,
      changeEmail,
      changeEmailValid,
      verifyEmailOtp,
      updateEmail,
      updateProfile,
      changePassword,
      changePasswordValid,
      verifyChangePassOtp,
};
