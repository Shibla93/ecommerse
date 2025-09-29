const Brand=require("../../model/brandSchema.js")
const mongoose = require("mongoose");
const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");

const getBrand=async(req,res)=>{
    
    
        const search=req.query.search||""
        let query={}
        if(search){
        query={
            $or:[
                { name: { $regex: search, $options: "i" } },
                
            ]
        }
    }

    const page=parseInt(req.query.page)||1;
    const limit=4;
     const skip=(page-1)*limit;

    const totalBrands = await Brand.countDocuments(query);
     const totalPages = Math.ceil(totalBrands/ limit);

        const brands = await (await Brand.find(query).sort({createdAt:-1}).skip(skip).limit(limit))
        res.render("admin/brand",{brands,search,currentPage:page,totalPages
})
}




const addBrand = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.ALL_FIELDS_REQUIERED });
    }

    const existBrand = await Brand.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") }
    });

    if (existBrand) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.BRAND_EXIST });
    }

    const newBrand = new Brand({ name });
    await newBrand.save();

    return res.status(StatusCodes.OK).json({ success: true, message: Messages.BRAND_ADDED });

  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
  }
};

const blockBrand=async(req,res)=>{
    try{
         const id = req.params.id;
        const check=await Brand.findById(id)
        if(check.isBlocked){
            const update=await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
            console.log(update)
            return res.json({success:true,message:"block"})
         } else{
             const update=await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
         return res.json({success:true,message:"unblock"})
        }
    }catch(error){
         return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
}

}









module.exports={
    getBrand,
    addBrand,
    blockBrand,
    

}