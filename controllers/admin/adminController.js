import User from "../../model/userSchema.js";
import Order from "../../model/orderSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";
import bcrypt from "bcrypt";
import moment from "moment";

const pageError = async (req, res) => {
  try {
    res.render("admin/error");
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR })
  }
}
const loadLogin = async (req, res) => {
  try {
    res.render("admin/login")
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNcxAL_SERVER_ERROR })
  }
}





const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (passwordMatch) {
            
        req.session.admin = admin._id;
    
      
      req.session.save(() => {
  return res.redirect("/admin/dashboard");
});
      } else {
        return res.render("admin/login", { error: Messages.INCORRECT_PASSWORD, email: email });
      }
    } else {
      return res.render("admin/login", {
     error:Messages.ADMIN_NOT_FOUND,
        email: email
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.redirect("/pageError");
  }
};





const getDateRange = (filter, startDate, endDate) => {
  let start, end;
  const today = new Date();

  switch (filter) {
    case "daily":
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;

    case "weekly":
  start = new Date(today);
  start.setDate(today.getDate() - 28); // last 4 weeks
  start.setHours(0,0,0,0);

  end = new Date();
  end.setHours(23,59,59,999);
  break;

    case "monthly":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "yearly":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "custom":
      start = startDate ? new Date(startDate) : new Date();
      end = endDate ? new Date(endDate) : new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    default:
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
  }

  return { startDate: start, endDate: end };
};
const loadDashboard = async (req, res) => {
  try {

    const { filter = "monthly", startDate: startDateQuery, endDate: endDateQuery } = req.query;
    const { startDate, endDate } = getDateRange(filter, startDateQuery, endDateQuery);
    let topProducts = await Order.aggregate([{
      $match: {
        paymentStatus: "paid",
      }
    },
    { $unwind: "$orderedItems" },
    {
      $group: {
        _id: "$orderedItems.productId",
        totalSold: { $sum: "$orderedItems.quantity" }
      }
    },
    {
      $sort: { totalSold: -1 }
    },
    { $limit: 5 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product"

      }
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.product",
        totalSold: 1
      }
    }
    ])


    let topCategories = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "product"

        }
      },

      { $unwind: "$product" },

      {
        $group: {
          _id: "$product.category",
          totalSold: { $sum: "$orderedItems.quantity" }
        }
      },

      { $sort: { totalSold: -1 } },
      { $limit: 5 },

      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: "$category" },

      {
        $project: {
          name: "$category.name",
          totalSold: 1
        }
      }
    ])
    let topBrands = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "product"

        }
      },

      { $unwind: "$product" },

      {
        $group: {
          _id: "$product.brand",
          totalSold: { $sum: "$orderedItems.quantity" }
        }
      },

      { $sort: { totalSold: -1 } },
      { $limit: 5 },

      {
        $lookup: {
          from: "brands",
          localField: "_id",
          foreignField: "_id",
          as: "brand"
        }
      },
      { $unwind: "$brand" },

      {
        $project: {
          name: "$brand.name",
          totalSold: 1
        }
      }
    ])

    
    let groupId;
    switch (filter) {
      case "daily": groupId = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }; break;
      case "weekly": groupId = {  week:{$week:"$createdAt"},
 year:{$year:"$createdAt"} }; break;
      case "monthly": groupId = { $month: "$createdAt" }; break;
      case "yearly": groupId = { $year: "$createdAt" }; break;
      case "custom": groupId = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }; break;
      default: groupId = { $month: "$createdAt" };
    }

    const salesAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: groupId, totalSales: { $sum: "$totalAmount" } } },
      { $sort: { _id: 1 } }
    ]);

    let salesData = [], labels = [];

    if (filter === "daily" || filter === "custom") {
      let current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = moment(current).format("YYYY-MM-DD");
        labels.push(dateStr);
        const item = salesAgg.find(s => moment(s._id).format("YYYY-MM-DD") === dateStr);
        salesData.push(item ? item.totalSales : 0);
        current.setDate(current.getDate() + 1);
      }
    } else if (filter === "monthly" || filter === "yearly") {
      labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      salesData = new Array(12).fill(0);
      salesAgg.forEach(item => { salesData[item._id - 1] = item.totalSales; });
    } else if (filter === "weekly") {
     labels = salesAgg.map(
s=>`Week ${s._id.week}-${s._id.year}`
);
      salesData = salesAgg.map(s => s.totalSales);
    } else {
  labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  salesData = new Array(12).fill(0);
  salesAgg.forEach(item => { salesData[item._id-1] = item.totalSales; });
}

    res.render("admin/dashboard", {
      topProducts,
      topCategories,
      topBrands,
      salesData,
      labels,
      filter,
      startDate: moment(startDate).format("YYYY-MM-DD"),
      endDate: moment(endDate).format("YYYY-MM-DD")
    });



  } catch (err) {
   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR })
  }
}
const getDashboardData = async (req, res) => {
  try {
    const { filter = "monthly", startDate: startDateQuery, endDate: endDateQuery } = req.query;

    
    const { startDate, endDate } = getDateRange(filter, startDateQuery, endDateQuery);

    const groupId =
      filter === "daily" || filter === "custom"
        ? { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
        : filter === "weekly"
          ? { $week: "$createdAt" }
          : { $month: "$createdAt" };

    const salesAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: groupId, totalSales: { $sum: "$totalAmount" } } },
      { $sort: { _id: 1 } }
    ]);

    let labels = [], salesData = [];
    if (filter === "daily" || filter === "custom") {
      let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = moment(current).format("YYYY-MM-DD");
    labels.push(dateStr);
    const item = salesAgg.find(s => moment(s._id).format("YYYY-MM-DD") === dateStr);
    salesData.push(item ? item.totalSales : 0);
    current.setDate(current.getDate() + 1);
  }

} else if (filter === "weekly") {

  labels = salesAgg.map(s => `Week ${s._id}`);
  salesData = salesAgg.map(s => s.totalSales);

} else if (filter === "yearly") {

  labels = salesAgg.map(s => s._id.toString());
  salesData = salesAgg.map(s => s.totalSales);

} else {


  labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  salesData = new Array(12).fill(0);
  salesAgg.forEach(item => {
    salesData[item._id - 1] = item.totalSales;
  });

}

    res.json({ labels, salesData });

  } catch (err) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: Messages.INTERNAL_SERVER_ERROR })
  }
};





// const logout = async (req, res) => {
//   try {
//     req.session.destroy(err => {
      
//       if (err) {
       
//         return res.redirect("/pageError")
//       }
//       res.redirect("/admin/login")
//     })
//   } catch (error) {

//     res.redirect("/pageError")
//   }
// }
const logout = async (req, res) => {

  try {

    req.session.admin = null;

    res.clearCookie("adminSession");

    return res.redirect("/admin/login");

  } catch (error) {

    console.log(error);

    return res.redirect("/pageError");
  }
};
const adminController = {
  loadLogin,
  login,
  loadDashboard,
  pageError,
  logout,
  getDashboardData
};
export default adminController





























