const Coupon = require("../../model/coupenSchema");

const loadCouponList = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render("admin/couponList", { coupons });
  } catch (error) {
    console.log(error);
    res.redirect("/admin/dashboard");
  }
};

const loadCreateCoupon = (req, res) => {
  res.render("admin/createCoupon");
};
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      expiryDate,
      usageLimit,
      isActive
    } = req.body;

    const existing = await Coupon.findOne({ code: code.toUpperCase() });

    if (existing) {
      return res.redirect("/admin/coupons");
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchase: minPurchase || 0,
      maxDiscount: maxDiscount || null,
      expiryDate,
      usageLimit: usageLimit || 1,
      isActive: isActive === "on"   
    });

    await newCoupon.save();

    res.redirect("/admin/coupons");

  } catch (error) {
    console.log(error);
    res.redirect("/admin/coupons");
  }
};

const updateCoupon = async (req, res) => {
  try {

    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      expiryDate,
      usageLimit,
      isActive
    } = req.body;

    const couponId = req.params.id;


    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
      _id: { $ne: couponId }   
    });

    if (existingCoupon) {
      return res.redirect("/admin/coupons");
    }

    await Coupon.findByIdAndUpdate(couponId, {
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchase: minPurchase || 0,
      maxDiscount: maxDiscount || null,
      expiryDate,
      usageLimit: usageLimit || 1,
      isActive: isActive === "on"
    });

    res.redirect("/admin/coupons");

  } catch (error) {
    console.log(error);
    res.redirect("/admin/coupons");
  }
};
const deleteCoupon = async (req, res) => {
  try {

    const couponId = req.params.id;

    await Coupon.findByIdAndUpdate(couponId, {
      isActive: false
    });

    res.redirect("/admin/coupons");

  } catch (error) {
    console.log(error);
    res.redirect("/admin/coupons");
  }
};

module.exports={
    loadCouponList,
    loadCreateCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon
}