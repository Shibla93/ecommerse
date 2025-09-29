const Messages = require("../constants/messages");
const StatusCodes = require("../constants/StatusCodes");
const User = require("../model/userSchema");

const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user);

    
    if (!user || user.isBlocked || user.isAdmin) {
      return req.session.destroy(() => 
        res.redirect("/login"));
    }

    next();
  } catch (error) {
    console.log("Error in userAuth middleware", error)
    return res.redirect("/login")
    }
  }



const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ _id: req.session.admin, isAdmin: true }) 
            .then(admin => {
                if (admin && !admin.isBlocked) {
                    next();
                } else {
                    req.session.destroy(() => {
                        res.redirect("/admin/login");
                    });
                }
            })
            .catch(error => {
                console.log("Error in adminAuth middleware", error);
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({message:Messages.INTERNAL_SERVER_ERROR});
            });
    } else {
        res.redirect("/admin/login");
    }
};






module.exports={
    userAuth,
    adminAuth,
    
}