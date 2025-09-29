const User=require("../../model/userSchema")
const mongoose = require("mongoose");
const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");

const getCustomer=async(req,res)=>{
    
        const search=req.query.search||""
        let query={isAdmin:false}
        
        if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
        
    

    const page=parseInt(req.query.page)||1;
    const limit=5;
     const skip=(page-1)*limit;

    const totalCustomers = await User.countDocuments(query);
     const totalPages = Math.ceil(totalCustomers / limit);

        const customers = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
        res.render("admin/customers",{customers,search,currentPage:page,totalPages})
    
}


const blockCustomer=async(req,res)=>{
    
        let userId=req.params.id
        const user= await User.updateOne({_id:userId},{$set:{isBlocked:true}})
         res.status(StatusCodes.OK).json({
            success: true,
            message: Messages.USER_BLOCKED,   
            userId
        });
    
}



const unblockCustomer=async(req,res)=>{
    
        let userId=req.params.id
        const user= await User.updateOne({_id:userId},{$set:{isBlocked:false}})
         res.status(StatusCodes.OK).json({
            success: true,
            message: Messages.USER_UNBLOCKED,  
            userId
        });
    
}

















module.exports={
    getCustomer,
    blockCustomer,
    unblockCustomer
}