import Category from "../../model/categorySchema.js";
import Product from "../../model/productSchema.js";

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
    console.error(err);
    res.status(500).send("Error loading offers");
  }
};

// Create Offer
const createOffer = async (req, res) => {
  try {
    const { offerName, offerType, offerPercentage, startDate, expiryDate, offerDescription } = req.body;
    
    let appliedProducts = [];
    let appliedCategories = [];

    // Product Offer
    if (offerType === "product" && req.body.products) {
      // convert to array if single select
      let products = req.body.products;
      if (!Array.isArray(products)) products = [products];
      
      // filter valid ObjectId
      appliedProducts = products.filter(id => mongoose.Types.ObjectId.isValid(id));

      // update Product collection
      for (let prodId of appliedProducts) {
        await Product.findByIdAndUpdate(prodId, { productOffer: offerPercentage });
      }
    }

    // Category Offer
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
    res.redirect("/admin/offers");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating offer");
  }
};

// Update Offer
const updateOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { offerName, offerType, offerPercentage, startDate, expiryDate, offerDescription } = req.body;

    const oldOffer = await Offer.findById(offerId);

    let appliedProducts = [];
    let appliedCategories = [];

    // Product Offer Update
    if (offerType === "product" && req.body.products) {
      let products = req.body.products;
      if (!Array.isArray(products)) products = [products];
      appliedProducts = products.filter(id => mongoose.Types.ObjectId.isValid(id));

      // Reset old product offers that are removed
      if (oldOffer.appliedProducts && oldOffer.appliedProducts.length > 0) {
        for (let prodId of oldOffer.appliedProducts) {
          if (!appliedProducts.includes(prodId.toString())) {
            if (mongoose.Types.ObjectId.isValid(prodId))
              await Product.findByIdAndUpdate(prodId, { productOffer: 0 });
          }
        }
      }

      // Update new product offers
      for (let prodId of appliedProducts) {
        if (mongoose.Types.ObjectId.isValid(prodId))
          await Product.findByIdAndUpdate(prodId, { productOffer: offerPercentage });
      }
    }

    // Category Offer Update
    if (offerType === "category" && req.body.category) {
      const catId = req.body.category;
      if (mongoose.Types.ObjectId.isValid(catId)) {
        appliedCategories = [catId];

        // Reset old category offers
        if (oldOffer.appliedCategories && oldOffer.appliedCategories.length > 0) {
          for (let oldCatId of oldOffer.appliedCategories) {
            if (oldCatId.toString() !== catId)
              await Category.findByIdAndUpdate(oldCatId, { categoryOffer: 0 });
          }
        }

        // Update new category offer
        await Category.findByIdAndUpdate(catId, { categoryOffer: offerPercentage });
      }
    }

    

    // Update the Offer document
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

    res.redirect("/admin/offers");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating offer");
  }
};
// Delete Offer
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
     const offer = await Offer.findById(id);
     if (offer.appliedProducts && offer.appliedProducts.length > 0) {
      for (let prodId of offer.appliedProducts) {
        await Product.findByIdAndUpdate(prodId, { productOffer: 0 });
      }
    }

    // Reset category offers
    if (offer.appliedCategories && offer.appliedCategories.length > 0) {
      for (let catId of offer.appliedCategories) {
        await Category.findByIdAndUpdate(catId, { categoryOffer: 0 });
      }
    }

    await Offer.findByIdAndDelete(id);
    res.redirect("/admin/offers");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting offer");
  }
};

const offerController={
  getOffersPage,
  createOffer,
  updateOffer,
  deleteOffer
};


export default offerController
