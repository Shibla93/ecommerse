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
      return res.render("forgot_pass", { error: Messages.USER_NOT_FOUND });

    const otp = generateOtp();
    req.session.forgotOtp = otp;
    req.session.forgotOtpExpiry = Date.now() + 1* 60 * 1000;
    req.session.resetEmail = email;

    const sent = await sendVerificationEmail(email, otp);
    if (!sent) return res.render("forgot_pass", { error: "Failed to send OTP" });

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

module.exports = {
  getForgotPass,
  postEmail,
  getForgotVerify,
  postForgotOtp,
  resendForgotOtp,
  newPass
};
