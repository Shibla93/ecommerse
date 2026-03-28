import User from "../../model/userSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";

const getCustomer = async (req, res) => {
  try {
    
    const search = req.query.search || "";
    let query = { isAdmin: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

  
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    
    const totalCustomers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalCustomers / limit);

    
    const customers = await User.find(query)
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Query:", query);
    console.log("Total customers:", totalCustomers);

  
    res.render("admin/customers", {
      customers,
      search,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};

// const blockCustomer=async(req,res)=>{
//         try{
    
//         let userId=req.params.id
//          const user=await User.findById(userId)
//         if(check.isBlocked){
//             const update=await User.updateOne({_id:userId},{$set:{isBlocked:false}})
//             console.log(update)
//             return res.json({success:true,message:Messages.USER_UNBLOCKED})
            

//          } else{
//              const update=await User.updateOne({_id:userId},{$set:{isBlocked:true}})
             
//          return res.json({success:true,message:Messages.USER_BLOCKED})
//         }
//     }catch(error){
//         return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
//     }
// }

const blockCustomer = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: Messages.USER_NOT_FOUND });
    }

    if (user.isBlocked) {
    
      await User.updateOne({ _id: userId }, { $set: { isBlocked: false } });

      
      if (req.session.user && req.session.user.toString() === userId.toString()) {
        req.session.user = null; 
      }

      return res.json({ success: true, message: Messages.USER_UNBLOCKED });
    } 
    else {
      
      await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });

      
      if (req.session.user && req.session.user.toString() === userId.toString()) {
        req.session.user = null; 
      }

      return res.json({ success: true, message: Messages.USER_BLOCKED });
    }

  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};



const userController={
    getCustomer,
    blockCustomer
}
export default userController