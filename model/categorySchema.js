import mongoose from 'mongoose';
const { Schema } = mongoose;



const categorySchema = new Schema({
  name: { 
    type: String,
     required: true,
     unique:true,
     trim:true

     },

  description: String,
  
  isListed: 
  { 
    type: Boolean, 
    default: true
 },
  isDeleted: { 
    type: Boolean,
     default: false
     },
categoryOffer: {
  type: Number,
default: 0,
    }

}, { timestamps: true });


const Category = mongoose.model("Category", categorySchema);
export default Category;
