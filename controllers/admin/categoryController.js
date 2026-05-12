
import Category from "../../model/categorySchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";


const getCategory = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    let query = {};

    if (search) {
      query = { name: { $regex: search, $options: "i" } };
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const totalCategories = await Category.countDocuments({...query,isDeleted:false});
    const totalPages = Math.ceil(totalCategories / limit);

    const category = await Category.find({...query,isDeleted:false})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/category", {
      category,
      search,
      currentPage: page,
      totalPages

    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
};


    


const addCategory = async (req, res) => {
  try {
    let { name, description } = req.body;

    name = name?.trim();
    description = description?.trim();
       

    
    if (!name || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.ALL_FIELDS_REQUIERED });
    }

    
    const existCategory = await Category.findOne({
      name: { $regex: new RegExp("^" + name + "$", "i") }
    });

    if (existCategory) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: Messages.CATEGORY_EXIST });
    }

  
    const newCategory = new Category({ name, description });
    await newCategory.save();
   return res.status(StatusCodes.OK).json({ success: true, message: Messages.CATEGORY_ADDED });
    
  } catch (error) {
    console.log(error)
  
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: Messages.INTERNAL_SERVER_ERROR })
  }
};




const listCategory= async(req,res)=>{
try{
         const id = req.params.id;
        const check=await Category.findById(id)
         if (!check) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: Messages.CATEGORY_NOT_FOUND });
    }
        if(check.isListed){
            const update=await Category.updateOne({_id:id},{$set:{isListed:false}})
            console.log(update)
            return res.json({success:true,message:"unlisted"})
         } else{
             let update=await Category.updateOne({_id:id},{$set:{isListed:true}})
         return res.json({success:true,message:"listed"})
        }
    }catch(error){
      console.log(error)
         return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
}

}

const editCategory=async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    
    if (!name || !description) {
       
res.json({ 
  success: false, 
  message: Messages.ALL_FIELDS_REQUIERED  
})
    }

const existCategory = await Category.findOne({
  name: { $regex: new RegExp("^" + name + "$", "i") },
  _id: { $ne: categoryId }
});

if (existCategory) {
  return res.json({
    success: false,
    message: Messages.CATEGORY_EXIST
  });
}
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name, description},
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(StatusCodes.NOT_FOUND).json({ 
  success: false, 
  message: Messages.CATEGORY_NOT_FOUND 
})
    }

    

    return res.json({
      success: true,
      message: Messages.CATEGORY_UPDATED,
      category: updatedCategory
    });

  } catch (error) {
    console.error(error);
     return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
}
    
 
const deleteCategory=async(req,res)=>{
  try {
    const id=req.params.id
    await Category.updateOne({_id:id},{$set:{isDeleted:true}})
     
     return res.json({success:true,message:Messages.CATEGORY_DELETED})

  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: Messages.INTERNAL_SERVER_ERROR });
  }
}






const categoryController={
    getCategory,
    addCategory,
    listCategory,
    editCategory,
    deleteCategory
    
}
export default categoryController