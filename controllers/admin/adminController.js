const User=require("../../model/userSchema")
const mongoose = require("mongoose");
const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");
const bcrypt = require("bcrypt");


const pageError=async function pageError(req, res) {
    res.render("admin/error", { error: Messages.INTERNAL_SERVER_ERROR });
}

const loadLogin=async(req,res)=>{
    try{
        res.render("admin/login")
    }catch(error){
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({error:Messages.INTERNAL_SERVER_ERROR})
    }
}





const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email, isAdmin: true });
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = admin._id;
                req.session.adminId = admin._id;
                return res.redirect("/admin/dashboard");
            } else {
                return res.render("admin/login", { error: Messages.INCORRECT_PASSWORD }); 
            }
        } else {
            return res.render("admin/login", { error: "Admin not found" });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.redirect("/pageError");
    }
};

const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render("admin/dashboard"); 
        } catch (error) {
            console.error("Dashboard error", error);
            res.redirect("/pageError");
        }
    } else {
        res.redirect("login");
    }
};


const logout=async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
console.log("Error destroying session",err)
return res.redirect("/pageError")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
      
      res.redirect ("/pageError")
    }
}
module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
};





























