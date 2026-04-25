import StatusCodes from "../../constants/StatusCodes.js";
import Messages from "../../constants/messages.js";
import Coupon from "../../model/coupenSchema.js";
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

    if(
!code ||
!discountType ||
!discountValue ||
!expiryDate
){
return res.json({
success:false,
message:Messages.ALL_FIELDS_REQUIERED
})
}

if(
new Date(expiryDate)
<= new Date()
){
return res.json({
success:false,
message:
Messages.COUPON_EXPIRY_INVALID
})
}
    if (discountType === "percentage") {

      if (discountValue <= 0 || discountValue > 100) {
        return res.json({
          success: false,
          message:Messages.COUPON_PERCENTAGE_INVALID
        });
      }

    } else if (discountType === "flat") {

      if (Number(discountValue) >= Number(minPurchase)) {
        return res.json({
          success: false,
          message: Messages.COUPON_FLAT_INVALID
        });
      }

    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });

    if (existing) {
      return res.json({
        success: false,
        message: Messages.COUPON_ALREADY_EXISTS
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
      message: 
Messages.COUPON_ADDED
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
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

    if(
new Date(expiryDate)
<= new Date()
){
return res.json({
success:false,
message:
Messages.COUPON_EXPIRY_INVALID
})
}

    if (discountType === "percentage") {

      if (discountValue <= 0 || discountValue > 100) {
        return res.json({
          success: false,
          message: Messages.COUPON_PERCENTAGE_INVALID
        });
      }

    } else if (discountType === "flat") {

      if (Number(discountValue) >= Number(minPurchase)) {
        return res.json({
          success: false,
          message: Messages.COUPON_FLAT_INVALID
        });
      }

    }

  

    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
      _id: { $ne: couponId }
    });

    if (existingCoupon) {
      return res.json({
        success: false,
        message: Messages.COUPON_ALREADY_EXISTS
      });
    }

    

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
      message: Messages.CATEGORY_UPDATED
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
    
    res.redirect("/admin/coupons");
  }
};

const coupenController={
    loadCouponList,
    loadCreateCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon
}
export default coupenController