import Order from "../../model/orderSchema.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import moment from "moment";



const getDateRange = (filter, startDate, endDate) => {

  let start, end;

  switch (filter) {

    case "daily":

      start = new Date();
      start.setHours(0,0,0,0);

      end = new Date();
      end.setHours(23,59,59,999);

    break;


    case "weekly":
  const today = new Date();
  start = new Date(today);
  start.setDate(today.getDate() - today.getDay()); // start of week (Sunday)
  start.setHours(0,0,0,0);
  end = new Date(today);
  end.setHours(23,59,59,999);
  break;

case "monthly":
  const now = new Date();
  start = new Date(now.getFullYear(), now.getMonth(), 1); 
  end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999); 
  break;


    case "yearly":

      start = new Date(new Date().getFullYear(), 0, 1);

      end = new Date();
      end.setHours(23,59,59,999);

    break;


    case "custom":

      start = startDate ? new Date(startDate) : new Date();
      end = endDate ? new Date(endDate) : new Date();

      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

    break;


    default:

      start = new Date();
      start.setHours(0,0,0,0);

      end = new Date();
      end.setHours(23,59,59,999);

  }

  return { startDate: start, endDate: end };

};




const getSalesReport = async (req,res)=>{

try{

const filter = req.query.filter || "daily";
const page = parseInt(req.query.page) || 1;
const limit = 20;

const {startDate,endDate} = getDateRange(filter,req.query.startDate,req.query.endDate);

const query = {
  createdAt:{ $gte:startDate , $lte:endDate }
};

const totalOrders = await Order.countDocuments(query);

const orders = await Order.find(query)
.sort({createdAt:-1})
.skip((page-1)*limit)
.limit(limit)
.lean();


let overallSalesCount = 0;
let overallOrderAmount = 0;
let overallDiscount = 0;
let couponDeductions = 0;


orders.forEach(order=>{

const subTotal = order.subTotal || 0;
const tax = order.tax || 0;
const offerDiscount = order.offerDiscount || 0;
const coupon = order.couponDiscount || 0;

const totalAmount = subTotal + tax - coupon;

overallSalesCount++;
overallOrderAmount += totalAmount;
overallDiscount += offerDiscount;
couponDeductions += coupon;

order.totalAmount = totalAmount;
order.discount = offerDiscount;

});


const totalPages = Math.ceil(totalOrders/limit);

res.render("admin/saleS",{

orders,
overallSalesCount,
overallOrderAmount,
overallDiscount,
couponDeductions,
filter,
startDate: moment(startDate).format("YYYY-MM-DD"), 
  endDate: moment(endDate).format("YYYY-MM-DD"), 
currentPage:page,
totalPages

});

}catch(error){

console.log(error);
res.status(500).send("Internal server error");

}

};



// EXCEL DOWNLOAD
const downloadExcel = async (req,res)=>{

try{

const filter = req.query.filter || "daily";

const {startDate,endDate} = getDateRange(filter,req.query.startDate,req.query.endDate);

const orders = await Order.find({
createdAt:{ $gte:startDate , $lte:endDate }
}).lean();


const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("Sales Report");


sheet.columns = [

{header:"Order #",key:"orderNumber",width:25},
{header:"Date",key:"date",width:18},
{header:"Total Amount",key:"totalAmount",width:18},
{header:"Discount",key:"discount",width:15},
{header:"Coupon Deduction",key:"coupon",width:18}

];


let totalAmount = 0;
let totalDiscount = 0;
let totalCoupon = 0;


orders.forEach(o=>{

const amount = (o.subTotal || 0) + (o.tax || 0) - (o.offerDiscount || 0) - (o.couponDiscount || 0);

sheet.addRow({

orderNumber:o.orderNumber,
date:moment(o.createdAt).format("DD-MM-YYYY"),
totalAmount:amount,
discount:o.offerDiscount || 0,
coupon:o.couponDiscount || 0

});

totalAmount += amount;
totalDiscount += o.offerDiscount || 0;
totalCoupon += o.couponDiscount || 0;

});


sheet.addRow([]);
sheet.addRow(["Overall Sales Count",orders.length]);
sheet.addRow(["Total Amount",totalAmount]);
sheet.addRow(["Total Discount",totalDiscount]);
sheet.addRow(["Coupon Deductions",totalCoupon]);


res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
res.setHeader("Content-Disposition","attachment; filename=sales-report.xlsx");

await workbook.xlsx.write(res);
res.end();

}catch(error){

console.log(error);
res.status(500).send("Excel generation error");

}

};



const downloadPDF = async (req, res) => {
  try {
    const filter = req.query.filter || "daily";

    const { startDate, endDate } = getDateRange(
      filter,
      req.query.startDate,
      req.query.endDate
    );

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      paymentStatus: "paid"
    }).lean();

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");

    doc.pipe(res);

    // 🟢 TITLE
    doc.fontSize(18).font("Helvetica-Bold").text("SALES REPORT", { align: "center" });

    doc.moveDown();
    doc.fontSize(11).font("Helvetica").text(
      `Date: ${moment(startDate).format("YYYY-MM-DD")} to ${moment(endDate).format("YYYY-MM-DD")}`
    );

    doc.moveDown(2);

    // 🟢 COLUMN POSITIONS (WIDTH FIXED)
    const startX = 40;
    const col = {
      order: startX,
      date: startX + 140,        // 🔥 increased spacing
      payment: startX + 240,
      status: startX + 330,
      amount: startX + 420
    };

    const tableTop = doc.y;

    // 🟢 HEADER
    doc.font("Helvetica-Bold").fontSize(10);

    doc.text("Order ID", col.order, tableTop, { width: 130 });
    doc.text("Date", col.date, tableTop, { width: 90 });
    doc.text("Payment", col.payment, tableTop, { width: 80 });
    doc.text("Status", col.status, tableTop, { width: 80 });
    doc.text("Amount", col.amount, tableTop, { width: 80 });

    doc.moveTo(startX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;

    doc.font("Helvetica").fontSize(9);

    let totalAmount = 0;
    let totalDiscount = 0;
    let totalCoupon = 0;

    orders.forEach((order) => {
      const amount =
        (order.subTotal || 0) +
        (order.tax || 0) -
        (order.offerDiscount || 0) -
        (order.couponDiscount || 0);

      // 🟢 Page break
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      // 🟢 ROW DATA (NO OVERLAP NOW)
      doc.text(order.orderNumber || "-", col.order, y, { width: 130 });
      doc.text(moment(order.createdAt).format("YYYY-MM-DD"), col.date, y, { width: 90 });
      doc.text(order.paymentMethod || "-", col.payment, y, { width: 80 });
      doc.text(order.paymentStatus || "-", col.status, y, { width: 80 }); // ✅ NEW
      doc.text(`₹${amount.toFixed(2)}`, col.amount, y, { width: 80 });

      y += 20;

      totalAmount += amount;
      totalDiscount += order.offerDiscount || 0;
      totalCoupon += order.couponDiscount || 0;
    });

    // 🟢 FOOTER
    doc.moveTo(startX, y).lineTo(550, y).stroke();
    y += 15;

    doc.font("Helvetica-Bold").fontSize(11);

    doc.text(`Total Orders: ${orders.length}`, startX, y);
    y += 20;
    doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, startX, y);
    y += 20;
    doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`, startX, y);
    y += 20;
    doc.text(`Coupon Deduction: ₹${totalCoupon.toFixed(2)}`, startX, y);

    doc.end();
  } catch (error) {
    console.log(error);
    res.status(500).send("PDF generation error");
  }
};


const salesController = {
getSalesReport,
downloadExcel,
downloadPDF
};
export default salesController