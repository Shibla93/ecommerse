
const mongoose=require("mongoose");
const {Schema}=mongoose;


const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        
        default:null
    },
    googleId:{
        type:String,
        unique:false,
        
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
   profileImage: {
      type: String,
      default: null
    },
   
    hasCustomImage: {
      type: Boolean,
      default: false
    },
 cart: {
  type: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1
      }
    }
  ],
  default: []
},

 
  emailVerificationToken: String,
    emailVerificationExpires: Date,
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now
    },
  
    // referalCode:{
    //     type:String
    // },
    // redeemed:{
    //     type:Boolean
    // },
    // redeemedUsers:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"User"
    // }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]


},
      { timestamps: true }
)




const User=mongoose.model("User",userSchema)
module.exports=User