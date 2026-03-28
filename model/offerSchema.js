
import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({

  offerType: {
    type: String,
    enum: ["product", "category"],
    required: true
  },

  offerName: {
    type: String,
    required: true
  },

  startDate: {
    type: Date,
    required: true
  },

  expiryDate: {
    type: Date,
    required: true
  },

  offerPercentage: {
    type: Number,
    required: true
  },

  offerDescription: {
    type: String
  },

  appliedProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    }
  ],

  appliedCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    }
  ],

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

export default mongoose.model("Offer", offerSchema);
