const mongoose = require("mongoose");
const { Schema } = mongoose;


const variantSchema = new Schema({
  dialColor: {
     type: String, 
     required: true
     },
  strapColor: { 
    type: String,
     required: true
     },   
  price: { 
    type: Number, 
    required: true ,
      min:0
},
  stock: { type: Number,
     default: 0 ,
       min:0
    },
     images: [
  {
      _id: false,
     originalUrl: String,
      croppedUrl: String 
    
  },
],
 isListed: { 
        type: Boolean,
         default: true
         },
    isDeleted: { type: Boolean, 
        default: false 
    },
})



const productSchema = new Schema(
  {
    product: { type: String,
         required: true, 
         trim: true
          },
    brand: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: "Brand", 
  required: true 
},

    description: 
    { type: String,
         trim: true
         },
   strapMaterial:{
    type: String,
    trim: true,
    enum: ["leather", "rubber", "metal", "ceramics","silicon","steel"], 
    required: true
   },
    discount: { 
        type: Number,
         default: 0,
          min:0
         },

    
    categories: [
      { type: mongoose.Schema.Types.ObjectId,
         ref: "Category", 
         required: true }
    ],

    variants: [variantSchema],
    reviews: {
      type:[
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
         name: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
    
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
   
   
    productOffer: { type: Number,
         default: 0 ,
         min:0
        }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
