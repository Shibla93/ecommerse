import User from "../../model/userSchema.js";
import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
import bcrypt from "bcrypt";
import streamifier from "streamifier";
import cloudinary from "../../helpers/cloudinary.js";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const generateReferralCode = async (name) => {
  let code;
  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    code = name.slice(0, 2).toUpperCase() + random;

    const user = await User.findOne({ referralCode: code });
    if (!user) exists = false;
  }

  return code;
};
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
    req.session.forgotOtpExpiry = Date.now() + 1 * 60 * 1000;
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
  try {
    const { otp } = req.body;

    console.log("Entered OTP:", otp);
    console.log("Session OTP:", req.session.forgotOtp);

    if (!req.session.forgotOtp || Date.now() > req.session.forgotOtpExpiry) {
      return res.json({
        success: false,
        message: Messages.OTP_EXPIRED
      });
    }

    if (otp !== req.session.forgotOtp.toString()) {
      return res.json({
        success: false,
        message: Messages.OTP_INVALID
      });
    }



    req.session.otpVerified = true;

    return res.json({
      success: true,
      redirect: "/reset-Newpass"
    });

  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
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

const getResetPassword = async (req, res) => {
  try {
    if (!req.session.otpVerified) {
      return res.redirect("/forgotpass");
    }
    res.render("reset_pass");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};


const newPass = async (req, res) => {
  try {
    const { p1, p2 } = req.body;
    const email = req.session.resetEmail;

    if (!email) return res.redirect("/forgotpass");

    if (p1 !== p2)
      return res.render("reset_pass", { error: Messages.PASSWORDS_DO_NOT_MATCH });

    const user = await User.findOne({ email });
    const isSameAsOld = await bcrypt.compare(p1, user.password);

    if (isSameAsOld) {
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


const userProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    if (!userData.referralCode) {
      const code = await generateReferralCode(userData.name);

      await User.findByIdAndUpdate(userId, {
        referralCode: code
      });

      userData.referralCode = code;
    }
    res.render('profile', {
      user: userData,
      activePage: "profile",
    });
  } catch (error) {
    console.error("Error for retreive profile data ", error);
    res.redirect("/pageNotFound")
  }
}
const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const { phone } = req.body;

    const updateData = {};


    if (phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.redirect("/userprofile");
      }
      updateData.phone = phone;
    }

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);
    console.log("SESSION USER:", req.session.user);

    if (req.file) {
      const uploadFromBuffer = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "profile_images" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
      };

      const result = await uploadFromBuffer();

      updateData.profileImage = result.secure_url;
      updateData.hasCustomImage = true;
    }

    await User.updateOne(
      { _id: userId },
      { $set: updateData }
    );

    res.redirect("/userprofile");
  } catch (error) {
    console.log(error);
    res.redirect("/userprofile");
  }
};


const changeEmail = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    res.render("user/change-email", {
      user: userData
    });
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}


const changeEmailValid = async (req, res) => {
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
        res.render("change-email-otp");
        console.log("email sent:", email);
        console.log("otp:", otp);



      } else {
        res.json("email-error")
      }
    } else {
      return res.render("change-email", {
        message: Messages.USER_NOT_FOUND
      })
    }
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}
const resendChangeEmailOtp = async (req, res) => {
  try {
    const email = req.session.email;

    if (!email) {
      return res.json({ success: false, message: "Session expired" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const sent = await sendVerificationEmail(email, otp);

    if (!sent) {
      return res.json({ success: false, message: "Failed to send OTP" });
    }

    console.log("Resent Change Email OTP:", otp)


    res.json({ success: true });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR })
  }

}



const verifyEmailOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;

    if (enteredOtp === req.session.userOtp) {
      return res.json({
        success: true,
        message: Messages.OTP_VERIFIED,
        redirect: "/new-email"
      });
    } else {
      return res.json({
        success: false,
        message: Messages.INVALID_OTP
      });
    }
  } catch (error) {
    console.log(error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

const getNewEmailPage = async (req, res) => {
  try {
    res.render("user/new-email");
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};


const updateEmail = async (req, res) => {
  try {
    const newEmail = req.body.newEmail;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    req.session.successMessage = Messages.EMAIL_CHANGED;
    res.redirect("/userProfile")
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}


const changePassword = async (req, res) => {
  try {
    const userId = req.session.user;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).render("user/profile", {
        user: req.user,

        success: false,
        message: Messages.USER_NOT_FOUND
      });
    }

    if (user.isGoogleUser) {
      return res.status(StatusCodes.BAD_REQUEST).render("user/profile", {
        user,
        success: false,
        message: Messages.GOOGLE_MANAGE
      });
    }


    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render("user/profile", {
        user,
        success: false,
        message: Messages.PASSWORDS_DO_NOT_MATCH
      });
    }


    if (newPassword.length < 8) {
      return res.render("user/profile", {
        user,
        success: false,
        message: "New password must be at least 8 characters"

      });
    }

    if (newPassword !== confirmPassword) {
      return res.render("user/profile", {
        user,
        success: false,
        message: Messages.PASSWORDS_DO_NOT_MATCH
      });
    }


    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.render("user/profile", {
      user,
      success: true,
      message: Messages.PASSWORD_CHANGE
    });

  } catch (err) {
    console.error(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
  };
}




const profileController = {
  getForgotPass,
  postEmail,
  getForgotVerify,
  postForgotOtp,
  resendForgotOtp,
  getResetPassword,
  newPass,
  userProfile,
  updateProfile,
  changeEmail,
  changeEmailValid,
  resendChangeEmailOtp,
  verifyEmailOtp,
  getNewEmailPage,
  updateEmail,
  changePassword,

};
export default profileController