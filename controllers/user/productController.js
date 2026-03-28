import User from "../../model/userSchema.js";
import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
import bcrypt from "bcrypt";

import Cart from "../../model/cartSchema.js";
import Brand from "../../model/brandSchema.js";
import Category from "../../model/categorySchema.js";
import Product from "../../model/productSchema.js";
import mongoose from "mongoose";
import cloudinary from "../../helpers/cloudinary.js";
import moment from "moment/moment.js";

const { max } = moment;


const loadShoppingPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false }).lean();

    
    const search = req.query.search || "";
    const selectedCategory = req.query.category || "";
    const selectedBrand = req.query.brand || "";
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    
    let minPrice = 0;
    let maxPrice = Number.MAX_SAFE_INTEGER;
    if (req.query.price) {
      const priceRange = req.query.price.trim();
      if (priceRange.includes("-")) {
        const parts = priceRange.split("-");
        minPrice = parseInt(parts[0].trim());
        maxPrice = parseInt(parts[1].trim());
      }
    }

    // --- Aggregation pipeline to fetch all variants ---
    const matchStage = {
      "variants.isDeleted": false,
      "variants.isListed": true,
      "variants.price": { $gte: minPrice, $lte: maxPrice },
    };

    if (search) {
      matchStage.product = { $regex: search, $options: "i" };
    }
    if (selectedCategory) {
  matchStage.category = new mongoose.Types.ObjectId(selectedCategory);
}

    if (selectedBrand) {
      matchStage.brand = { $in: [new mongoose.Types.ObjectId(selectedBrand)] };
    }

    

    let products = await Product.aggregate([
  { $unwind: "$variants" },
  { $match: { 
      "variants.isDeleted": false,
      "variants.isListed": true,
      "variants.price": { $gte: minPrice, $lte: maxPrice },
      ...(search && { product: { $regex: search, $options: "i" } }),
     ...(selectedCategory && { category: new mongoose.Types.ObjectId(selectedCategory) }),
     ...(selectedBrand && { 
      brand: new mongoose.Types.ObjectId(selectedBrand) 
    })
    } 
  },
  // join brand
  { $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brandDetails" } },
  { $unwind: "$brandDetails" },
  { $match: { "brandDetails.isBlocked": false } },

  // join category
  { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "categoryDetails" } },
  { $match: { "categoryDetails.isListed": true } },

  // projection
  { $project: {
      _id: 0,
      productId: "$_id",
      product: 1,
      brand: "$brandDetails",
      category: { $arrayElemAt: ["$categoryDetails", 0] },
      dialColor: "$variants.dialColor",
      strapColor: "$variants.strapColor",
      price: "$variants.price",
       stock: "$variants.stock", 
      image: { $arrayElemAt: ["$variants.images.croppedUrl", 0] },
      variantId: "$variants._id",
      createdAt: "$createdAt",
       productOffer: 1,
    categoryOffer: { $arrayElemAt: ["$categoryDetails.categoryOffer", 0] }
    } 
  }
]);

  products = products.map(p => {
  const maxOffer = Math.max(p.productOffer || 0, p.category.categoryOffer || 0);
  const discount = p.price * (maxOffer / 100);
  const finalPrice =  Math.round(p.price - discount);

  return {
    ...p,
    maxOffer,
    discount,
    finalPrice
  };
});

    
    switch (sort) {
      case "priceLowHigh":
        products.sort((a, b) => a.finalPrice - b.finalPrice);
        break;
      case "priceHighLow":
        products.sort((a, b) => b.finalPrice - a.finalPrice);
        break;
      case "nameAsc":
        products.sort((a, b) => a.product.localeCompare(b.product));
        break;
      case "nameDesc":
        products.sort((a, b) => b.product.localeCompare(a.product));
        break;
      case "newest":
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "oldest":
        products.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      default:
        break; 
    }

    
    const totalProducts = products.length;
    const totalPages = Math.ceil(totalProducts / limit);
    products = products.slice(skip, skip + limit);

    
    res.render("shop", {
      user: userData,
      products,
      categories,
      selectedCategory: req.query.category || null,
  selectedBrand: req.query.brand || null,
  sort: req.query.sort || null,
  search: req.query.search || "",
  priceRange: req.query.price || null,
      sort,
      brands,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.redirect("/pageNotFound");
  }
};

const loadProductDetail = async (req, res) => {
 try {
   const userId = req.session.user;
  const userData = userId ? await User.findById(userId) : null;
  const id = req.params.id;

    const product = await Product.findById(id)
     .populate('brand', 'name')
     .populate('category', 'name')
    .lean();

   if (!product) {
      return res.redirect('/shop');
    }

    
    const listedVariants = product.variants.filter(v => v.isListed===true && v.isDeleted===false);

    
    if (listedVariants.length === 0) {
      return res.render('product-detail', {
        product,
        message:Messages.SOLD_OUT
      });
    }


    const variantId = req.query.variant;
    let activeVariant = listedVariants[0];
    if (variantId) {
      const found = listedVariants.find(v => String(v._id) === String(variantId));
      if (found) activeVariant = found;
    }

    const maxOffer = Math.max(
  product.productOffer || 0,
  product.category.categoryOffer || 0
);

const discount = activeVariant.price * (maxOffer / 100);
const finalPrice = Math.round(activeVariant.price - discount);

     const relatedProducts = await Product.find({
      _id: { $ne: product._id }, 
      category: product.category, 
      'variants.isListed': true,
  'variants.isDeleted': false
    })
      .limit(4) 
      .populate('brand', 'name')
      .lean();

    // render
     
    res.render("product-details", {
     user: userData,
      product,
      activeVariant,
      listedVariants,
      relatedProducts,
       maxOffer,
 finalPrice   
    });
  } catch (error) {
    console.log("Error loading product details:", error);
    res.redirect("/pageNotFound");
  }
};



const addReview=async(req,res)=>{
    try{
    const {rating,comment}=req.body;
    const product=await Product.findById(req.params.id)

       const user= req.session.user;
       const userData = await User.findById(user);


 if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: Messages.USER_NOT_FOUND});
    }

    if(!product){
        return res.status(StatusCodes.NOT_FOUND).json({message:Messages.PRODUCT_NOT_FOUND})
    }

    const newReview = {
      user: userData._id, 
      name: userData.name,
      rating: Number(rating),              
      comment,
      createdAt: new Date(),
    }


    product.reviews.push(newReview);

     const total = product.reviews.reduce((acc, item) => acc + item.rating, 0);
    product.averageRating = total / product.reviews.length;

      await product.save();
       res.json({ message: Messages.REVIEW_ADDED, product });
    }catch(error){
   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR });
     
    }
}

  

  



 const productController={
    loadShoppingPage,
    loadProductDetail,
    addReview
}
export default  productController