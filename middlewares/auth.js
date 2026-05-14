import Messages from "../constants/messages.js";
import StatusCodes from "../constants/StatusCodes.js";
import User from "../model/userSchema.js";
// const userAuth = async (req, res, next) => {
//   try {
//     if (!req.session.user) {
//       return res.redirect("/login");
//     }

//     const user = await User.findById(req.session.user);

    
//     if (!user || user.isBlocked || user.isAdmin) {
//       return req.session.destroy(() => 
//         res.redirect("/login"));
//     }

//     next();
//   } catch (error) {
//     console.log("Error in userAuth middleware", error)
//     return res.redirect("/login")
//     }
//   }
// // const userAuth = async (req, res, next) => {
// //   try {
// //     if (!req.session?.user) {
// //       return res.redirect("/login");
// //     }

// //     const user = await User.findById(req.session.user);

// //     if (!user || user.isBlocked || user.isAdmin) {
// //       return req.session.destroy(() => {
// //         res.redirect("/login");
// //       });
// //     }

// //     next();
// //   } catch (error) {
// //     console.log("userAuth error:", error);
// //     return res.redirect("/login");
// //   }
// // };

// const userAuth = async (req, res, next) => {
//   try {

//     if (!req.session.user) {

//       // fetch request
//       if (req.headers["content-type"] === "application/json") {
//         return res.status(401).json({
//           success: false,
//           redirect: "/login"
//         });
//       }

//       return res.redirect("/login");
//     }

//     const user = await User.findById(req.session.user);

//     if (!user || user.isBlocked || user.isAdmin) {

//       req.session.destroy(() => {

//         if (req.headers["content-type"] === "application/json") {
//           return res.status(401).json({
//             success: false,
//             redirect: "/login"
//           });
//         }

//         return res.redirect("/login");
//       });

//       return;
//     }

//     next();

//   } catch (error) {

//     console.log(error);

//     return res.status(500).json({
//       success: false
//     });
//   }
// };
const userAuth = async (req, res, next) => {
  try {

    if (!req.session.user) {

      if (req.headers["content-type"] === "application/json") {
        return res.status(401).json({
          success: false,
          redirect: "/login"
        });
      }

      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user);

    if (!user || user.isBlocked || user.isAdmin) {

      req.session.user = null;

      if (req.headers["content-type"] === "application/json") {
        return res.status(401).json({
          success: false,
          redirect: "/login"
        });
      }

      return res.redirect("/login");
    }

    next();

  } catch (error) {

    console.log("userAuth error:", error);

    return res.status(500).json({
      success: false
    });
  }
};
// const adminAuth = (req, res, next) => {
//     if (req.session.admin) {
//         User.findOne({ _id: req.session.admin, isAdmin: true }) 
//             .then(admin => {
//                 if (admin && !admin.isBlocked) {
//                     next();
//                 } else {
//                     req.session.destroy(() => {
//                         res.redirect("/admin/login");
//                     });
//                 }
//             })
//             .catch(error => {
//                 console.log("Error in adminAuth middleware", error);
//                 res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({message:Messages.INTERNAL_SERVER_ERROR});
//             });
//     } else {
//         res.redirect("/admin/login");
//     }
// };
const adminAuth = async (req, res, next) => {
  try {

    if (!req.session.admin) {
      return res.redirect("/admin/login");
    }

    const admin = await User.findOne({
      _id: req.session.admin,
      isAdmin: true
    });

    if (!admin || admin.isBlocked) {

      req.session.admin = null;

      return res.redirect("/admin/login");
    }

    next();

  } catch (error) {

    console.log("Error in adminAuth middleware", error);

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: Messages.INTERNAL_SERVER_ERROR
    });
  }
};





export{
    userAuth,
    adminAuth,
    
}