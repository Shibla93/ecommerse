
const Coupon = require("../../model/coupenSchema");
const User =require("../../model/userSchema")

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


module.exports={
    getCoupens
}
