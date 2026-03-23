
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
  
    referralCode: {
    type: String,
    unique: true
},
referredBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null
},

referralRewards: [{
    offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
    redeemed: { type: Boolean, default: false },
    createdOn: { type: Date, default: Date.now }
}],
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