import Category from "../../model/categorySchema.js";
import Product from "../../model/productSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
import mongoose from "mongoose";
import Offer from "../../model/offerSchema.js";



const getOffersPage = async (req, res) => {
  try {
    const page=parseInt(req.query.page)||1
    const limit=6
    const skip=(page-1)*limit
    const totalOffer=await Offer.countDocuments()
    const offers = await Offer.find()
      .populate("appliedProducts")
      .populate("appliedCategories")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      


    const products = await Product.find().lean();


    const categories = await Category.find({ isDeleted: false, isListed: true });
   const totalPages=Math.ceil(totalOffer/limit)
    res.render("admin/offers", { offers, products, categories,
      currentPage:page,
      totalPages
     });
  } catch (err) {
    res.status(
StatusCodes.INTERNAL_SERVER_ERROR
).json({
message:
Messages.INTERNAL_SERVER_ERROR
})
  }
};


const createOffer = async (req, res) => {
  try {
    const { offerName, offerType, offerPercentage, startDate, expiryDate, offerDescription } = req.body;
    if(
!offerName ||
!offerType ||
!offerPercentage ||
!startDate ||
!expiryDate
){
return res.status(
StatusCodes.BAD_REQUEST
).json({
message:
Messages.ALL_FIELDS_REQUIERED
})
}
if(
offerPercentage<=0 ||
offerPercentage>90
){
return res.json({
message:
Messages.OFFER_PERCENTAGE_INVALID
})
}
if(
new Date(startDate)
>=
new Date(expiryDate)
){
return res.json({
message:
Messages.OFFER_DATE_INVALID
})
}
    let appliedProducts = [];
    let appliedCategories = [];

    
    if (offerType === "product" && req.body.products) {
    
      let products = req.body.products;
      if (!Array.isArray(products)) products = [products];
      
      
      appliedProducts = products.filter(id => mongoose.Types.ObjectId.isValid(id));

      
      for (let prodId of appliedProducts) {
        await Product.findByIdAndUpdate(prodId, { productOffer: offerPercentage });
      }
    }

    
    if (offerType === "category" && req.body.category) {
      const catId = req.body.category;
      if (mongoose.Types.ObjectId.isValid(catId)) {
        appliedCategories = [catId];
        await Category.findByIdAndUpdate(catId, { categoryOffer: offerPercentage });
      }
    }

    
    const newOffer = new Offer({
      offerName,
      offerType,
      offerPercentage,
      startDate,
      expiryDate,
      offerDescription,
      appliedProducts,
      appliedCategories
    });

    await newOffer.save();
   return res.json({
success:true,
message:
Messages.OFFER_ADDED
})
  } catch (err) {
   res.status(
StatusCodes.INTERNAL_SERVER_ERROR
).json({
message:
Messages.INTERNAL_SERVER_ERROR
})
  }
};


const updateOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { offerName, offerType, offerPercentage, startDate, expiryDate, offerDescription } = req.body;

    const oldOffer = await Offer.findById(offerId);

    let appliedProducts = [];
    let appliedCategories = [];

    
    if (offerType === "product" && req.body.products) {
      let products = req.body.products;
      if (!Array.isArray(products)) products = [products];
      appliedProducts = products.filter(id => mongoose.Types.ObjectId.isValid(id));

      
      if (oldOffer.appliedProducts && oldOffer.appliedProducts.length > 0) {
        for (let prodId of oldOffer.appliedProducts) {
          if (!appliedProducts.includes(prodId.toString())) {
            if (mongoose.Types.ObjectId.isValid(prodId))
              await Product.findByIdAndUpdate(prodId, { productOffer: 0 });
          }
        }
      }


      for (let prodId of appliedProducts) {
        if (mongoose.Types.ObjectId.isValid(prodId))
          await Product.findByIdAndUpdate(prodId, { productOffer: offerPercentage });
      }
    }

    
    if (offerType === "category" && req.body.category) {
      const catId = req.body.category;
      if (mongoose.Types.ObjectId.isValid(catId)) {
        appliedCategories = [catId];

        
        if (oldOffer.appliedCategories && oldOffer.appliedCategories.length > 0) {
          for (let oldCatId of oldOffer.appliedCategories) {
            if (oldCatId.toString() !== catId)
              await Category.findByIdAndUpdate(oldCatId, { categoryOffer: 0 });
          }
        }

        
        await Category.findByIdAndUpdate(catId, { categoryOffer: offerPercentage });
      }
    }

    

    
    await Offer.findByIdAndUpdate(offerId, {
      offerName,
      offerType,
      offerPercentage,
      startDate,
      expiryDate,
      offerDescription,
      appliedProducts,
      appliedCategories
    });

       return res.json({
success:true,
message:
Messages.OFFER_UPDATED
})

  } catch (err) {
   res.status(
StatusCodes.INTERNAL_SERVER_ERROR
).json({
message:
Messages.INTERNAL_SERVER_ERROR
})
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
     const offer = await Offer.findById(id);
     if (offer.appliedProducts && offer.appliedProducts.length > 0) {
      for (let prodId of offer.appliedProducts) {
        await Product.findByIdAndUpdate(prodId, { productOffer: 0 });
      }
    }

    
    if (offer.appliedCategories && offer.appliedCategories.length > 0) {
      for (let catId of offer.appliedCategories) {
        await Category.findByIdAndUpdate(catId, { categoryOffer: 0 });
      }
    }

    await Offer.findByIdAndDelete(id);
      return res.json({
success:true,
message:
Messages.OFFER_DELETED
})
  } catch (err) {
    res.status(
StatusCodes.INTERNAL_SERVER_ERROR
).json({
message:
Messages.INTERNAL_SERVER_ERROR
})
  }
};

const offerController={
  getOffersPage,
  createOffer,
  updateOffer,
  deleteOffer
};


export default offerController
