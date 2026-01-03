const User = require("../../model/userSchema");
const Address=require("../../model/addressSchema");
const Messages = require('../../constants/messages');
const StatusCodes = require("../../constants/StatusCodes");


const getAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const userAddress = await Address.findOne({ userId });

        res.render("user/address-list", {
            user,
            userAddress: userAddress?.address || [],
            activePage: "address"
        });
    } catch (error) {
        console.error("Error loading address list:", error);
        res.redirect("/pageNotFound");
    }
};

const addAddress=async(req,res)=>{
    try {
       const userId=req.session.user;
        const user = await User.findById(userId);
       res.render("add-address",{
        user,
        activePage: "address"
      }) 
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: Messages.USER_NOT_FOUND });
    }

    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altphone
    } = req.body;

    const errors = {};

    const namePattern = /^[A-Za-z\s]+$/;
    const pincodePattern = /^\d{6}$/;
    const phonePattern = /^[6-9]\d{9}$/;

    
    if (!addressType || !addressType.trim()) {
      errors.addressType = "Address type is required";
    }

    
    if (!name || !name.trim()) {
      errors.name = "Name is required";
    } else if (!namePattern.test(name)) {
      errors.name = "Name must contain alphabets only";
    }

    
    if (!city || !city.trim()) {
      errors.city = "City is required";
    } else if (!namePattern.test(city)) {
      errors.city = "City must contain alphabets only";
    }

    if (!state || !state.trim()) {
      errors.state = "State is required";
    } else if (!namePattern.test(state)) {
      errors.state = "State must contain alphabets only";
    }

    
    if (!pincode || !pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!pincodePattern.test(pincode)) {
      errors.pincode = "Pincode must be 6 digits";
    }

    
    if (!phone || !phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!phonePattern.test(phone)) {
      errors.phone = "Phone number must be 10 digits";
    }

    
    if (altphone) {
      if (!phonePattern.test(altphone)) {
        errors.altphone = "Alternate phone must be 10 digits";
      } else if (altphone === phone) {
        errors.altphone = "Alternate phone must be different from phone";
      }
    }

  
    if (Object.keys(errors).length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        errors
      });
    }

    const userAddress = await Address.findOne({ userId });

    if (!userAddress) {
      await Address.create({
        userId,
        address: [{ addressType, name, city, landMark, state, pincode, phone, altphone }]
      });
    } else {
      userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altphone });
      await userAddress.save();
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: Messages.ADDRESS_SAVED
    });

  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};
const editAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.params.id;

    if (!addressId) {
      return res.redirect("/pageNotFound");
    }

    const user = await User.findById(userId);

    const addressDoc = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );

    if (!addressDoc || !addressDoc.address.length) {
      return res.redirect("/pageNotFound");
    }

    res.render("edit-address", {
      user,
      address: addressDoc.address[0], 
      activePage: "address"
    });

  } catch (error) {
    console.error("Edit address error:", error);
    res.redirect("/pageNotFound");
  }
};




const postEditAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressId = req.params.id;

    
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: Messages.USER_NOT_FOUND });
    }
  console.log("Address ID:", addressId)
    const {
      addressType,
      name,
      city,
      landMark,
      state,
      pincode,
      phone,
      altphone
    } = req.body;

    const errors = {};

    const namePattern = /^[A-Za-z\s]+$/;
    const pincodePattern = /^\d{6}$/;
    const phonePattern = /^[6-9]\d{9}$/;

    
    if (!addressType || !addressType.trim()) {
      errors.addressType = "Address type is required";
    }

    
    if (!name || !name.trim()) {
      errors.name = "Name is required";
    } else if (!namePattern.test(name)) {
      errors.name = "Name must contain alphabets only";
    }

    
    if (!city || !city.trim()) {
      errors.city = "City is required";
    } else if (!namePattern.test(city)) {
      errors.city = "City must contain alphabets only";
    }

    if (!state || !state.trim()) {
      errors.state = "State is required";
    } else if (!namePattern.test(state)) {
      errors.state = "State must contain alphabets only";
    }

    
    if (!pincode || !pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!pincodePattern.test(pincode)) {
      errors.pincode = "Pincode must be 6 digits";
    }

    
    if (!phone || !phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!phonePattern.test(phone)) {
      errors.phone = "Phone number must be 10 digits";
    }

    
    if (altphone) {
      if (!phonePattern.test(altphone)) {
        errors.altphone = "Alternate phone must be 10 digits";
      } else if (altphone === phone) {
        errors.altphone = "Alternate phone must be different from phone";
      }
    }

  
    if (Object.keys(errors).length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        errors
      });
    }

    const result = await Address.updateOne(
      { userId, "address._id": addressId },
      {
        $set: {
          "address.$.addressType": addressType,
          "address.$.name": name,
          "address.$.city": city,
          "address.$.landMark": landMark,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.phone": phone,
          "address.$.altphone": altphone
        }
      }
    );

    return  res.json({
      success: true,
      message:Messages.ADDRESS_UPDATED
    });


  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};



const deleteAddress = async (req, res) => {
  
try {
     const addressId = req.params.id;
    await Address.deletOne(
      { "address._id": addressId },
      { $pull: { address: { _id: addressId } } }
    );

    
     res.redirect('/address');
  } catch (error) {
    
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: Messages.INTERNAL_SERVER_ERROR});
  }
};


module.exports={
    getAddress,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress

}