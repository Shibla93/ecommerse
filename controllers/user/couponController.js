
import Coupon from "../../model/coupenSchema.js";
import User from "../../model/userSchema.js";

const getCoupens=async(req,res)=>{
    try {

        const userId = req.session.user;
            if (!userId) return res.redirect("/login");
        
            const user = await User.findById(userId);
    const coupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: new Date() }
    }).sort({ createdAt: -1 });

    res.render('coupon', {
      coupons,
      activePage: 'coupon', 
      user
    });
  } catch (err) {
    console.error(err);
       return res.json({ success: false, message: Messages.INTERNAL_SERVER_ERROR })

  }
};


const couponController={
    getCoupens
}
export default couponController