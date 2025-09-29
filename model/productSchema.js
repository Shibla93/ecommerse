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
    url: { type: String, required: true },
    public_id: { type: String, required: true }
  }
]
})



const productSchema = new Schema(
  {
    name: { type: String,
         required: true, 
         trim: true, 
         unique: true },
    brand: { 
        type: String, 
        required: true,
         trim: true 
        },
    description: 
    { type: String,
         trim: true
         },
   strapMaterial:{
    type: String,
    trim: true,
    enum: ["leather", "rubber", "metal", "ceramics","silicon"], 
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
   
    isListed: { 
        type: Boolean,
         default: true
         },
    isDeleted: { type: Boolean, 
        default: false 
    },
    productOffer: { type: Number,
         default: 0 ,
         min:0
        }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
