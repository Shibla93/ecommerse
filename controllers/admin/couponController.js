const Coupon = require("../../model/coupenSchema");

const loadCouponList = async (req, res) => {
  try {
    const page=parseInt(req.query.page)||1
    const limit=6
    const skip=(page-1)*limit
    const totalCoupens=await Coupon.countDocuments();
    const totalPages=Math.ceil(totalCoupens/limit)
    const coupons = await Coupon.find()
    .sort({ createdAt: -1 })
     .skip(skip)
      .limit(limit);
    res.render("admin/couponList", { coupons ,
      currentPage: page,
      totalPages
    });
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

    // ✅ FIXED VALIDATION
    if (discountType === "percentage") {

      if (discountValue <= 0 || discountValue > 100) {
        return res.json({
          success: false,
          message: "Percentage must be between 1 and 100"
        });
      }

    } else if (discountType === "flat") {

      if (Number(discountValue) >= Number(minPurchase)) {
        return res.json({
          success: false,
          message: "Flat discount must be less than minimum purchase"
        });
      }

    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });

    if (existing) {
      return res.json({
        success: false,
        message: "Coupon already exists"
      });
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(Number(discountValue).toFixed(2)),
      minPurchase: Number(Number(minPurchase || 0).toFixed(2)),
      maxDiscount: maxDiscount ? Number(Number(maxDiscount).toFixed(2)) : null,
      expiryDate,
      usageLimit: usageLimit || 1,
      isActive: isActive === "on"
    });

    await newCoupon.save();

    return res.json({
      success: true,
      message: "Coupon added successfully"
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Server error"
    });
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

    /* ✅ FIXED VALIDATION */

    if (discountType === "percentage") {

      if (discountValue <= 0 || discountValue > 100) {
        return res.json({
          success: false,
          message: "Percentage must be between 1 and 100"
        });
      }

    } else if (discountType === "flat") {

      if (Number(discountValue) >= Number(minPurchase)) {
        return res.json({
          success: false,
          message: "Flat discount must be less than minimum purchase"
        });
      }

    }

    /* ✅ EXISTING CHECK */

    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
      _id: { $ne: couponId }
    });

    if (existingCoupon) {
      return res.json({
        success: false,
        message: "Coupon already exists"
      });
    }

    /* ✅ UPDATE */

    await Coupon.findByIdAndUpdate(couponId, {
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(Number(discountValue).toFixed(2)),
      minPurchase: Number(Number(minPurchase || 0).toFixed(2)),
      maxDiscount: maxDiscount ? Number(Number(maxDiscount).toFixed(2)) : null,
      expiryDate,
      usageLimit: usageLimit || 1,
      isActive: isActive === "on"
    });

    return res.json({
      success: true,
      message: "Coupon updated successfully"
    });

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