import Order from "../../model/orderSchema.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import moment from "moment";
import { calculateItemRefund } from "../../helpers/refundCalculator.js";


// -------------------- DATE RANGE --------------------
const getDateRange = (filter, startDate, endDate) => {
  let start, end;

  switch (filter) {
    case "daily":
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
      break;

    case "weekly":
      const today = new Date();
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;

    case "monthly":
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "yearly":
      start = new Date(new Date().getFullYear(), 0, 1);
      end = new Date();
      end.setHours(23, 59, 59, 999);
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


// -------------------- SALES REPORT --------------------
const getSalesReport = async (req, res) => {
  try {
    const filter = req.query.filter || "daily";
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const { startDate, endDate } = getDateRange(
      filter,
      req.query.startDate,
      req.query.endDate
    );

    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const totalOrders = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // -------------------- STATS --------------------
    let overallSalesCount = 0;
    let overallOrderAmount = 0;
    let overallRefund = 0;
    let overallDiscount = 0;
    let couponDeductions = 0;

    orders.forEach((order) => {
      let subTotal = 0;
      let refundAmount = 0;

      // ACTIVE ITEMS subtotal
      order.orderedItems.forEach((item) => {
        const itemTotal = item.purchasedPrice * item.quantity;

        if (!["cancelled", "returned"].includes(item.itemStatus)) {
          subTotal += itemTotal;
        }
      });

      const tax = Math.round(subTotal * 0.05);

      // ORDER AMOUNT (what system expects)
      const totalAmount = subTotal + tax;

      // REFUND CALCULATION (ONLY returned items)
      order.orderedItems.forEach((item) => {
        if (item.itemStatus === "returned") {
          refundAmount += calculateItemRefund(order, item);
        }
      });

      overallSalesCount++;
      overallOrderAmount += totalAmount;
      overallRefund += refundAmount;

      overallDiscount += order.offerDiscount || 0;
      couponDeductions += order.couponDiscount || 0;

      order.totalAmount = totalAmount;
      order.refundAmount = refundAmount;
    });

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("admin/saleS", {
      orders,
      overallSalesCount,
      overallOrderAmount,
      overallDiscount,
      couponDeductions,
      overallRefund,
      netRevenue: overallOrderAmount - overallRefund,
      filter,
      startDate: moment(startDate).format("YYYY-MM-DD"),
      endDate: moment(endDate).format("YYYY-MM-DD"),
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error");
  }
};


// -------------------- EXCEL DOWNLOAD --------------------
const downloadExcel = async (req, res) => {
  try {
    const filter = req.query.filter || "daily";

    const { startDate, endDate } = getDateRange(
      filter,
      req.query.startDate,
      req.query.endDate
    );

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    sheet.columns = [
      { header: "Order #", key: "orderNumber", width: 25 },
      { header: "Date", key: "date", width: 18 },
      { header: "Status", key: "status", width: 15 },
      { header: "Payment", key: "payment", width: 15 },
      { header: "Amount", key: "totalAmount", width: 18 },
      { header: "Refund", key: "refund", width: 15 },
    ];

    let totalAmount = 0;
    let totalRefund = 0;

    orders.forEach((order) => {
      let subTotal = 0;
      let refund = 0;

      order.orderedItems.forEach((item) => {
        const itemTotal = item.purchasedPrice * item.quantity;

        if (!["cancelled", "returned"].includes(item.itemStatus)) {
          subTotal += itemTotal;
        }

        if (item.itemStatus === "returned") {
          refund += calculateItemRefund(order, item);
        }
      });

      const tax = Math.round(subTotal * 0.05);
      const amount = subTotal + tax;

      sheet.addRow({
        orderNumber: order.orderNumber,
        date: moment(order.createdAt).format("DD-MM-YYYY"),
        status: order.orderStatus,
        payment: order.paymentMethod,
        totalAmount: amount,
        refund: refund,
      });

      totalAmount += amount;
      totalRefund += refund;
    });

    sheet.getRow(1).font = { bold: true };

    sheet.addRow([]);
    sheet.addRow(["Total Orders", orders.length]);
    sheet.addRow(["Total Amount", totalAmount]);
    sheet.addRow(["Total Refund", totalRefund]);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
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
    })
      .sort({ createdAt: -1 })
      .lean();

    // 👉 LANDSCAPE avoids overlap (IMPORTANT FIX)
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales-report.pdf"
    );

    doc.pipe(res);

    // ================= TITLE =================
    doc.fontSize(18).font("Helvetica-Bold").text("SALES REPORT", {
      align: "center",
    });

    doc.moveDown();

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `From: ${moment(startDate).format("YYYY-MM-DD")} To: ${moment(endDate).format("YYYY-MM-DD")}`,
        { align: "center" }
      );

    doc.moveDown(2);

    // ================= TABLE HEADER =================
    const tableTop = 80;

    const col = {
      order: 40,
      date: 170,
      payment: 260,
      status: 350,
      amount: 460,
      refund: 560,
    };

    doc.font("Helvetica-Bold").fontSize(10);

    doc.text("Order#", col.order, tableTop);
    doc.text("Date", col.date, tableTop);
    doc.text("Payment", col.payment, tableTop);
    doc.text("Status", col.status, tableTop);
    doc.text("Amount", col.amount, tableTop, { width: 80, align: "right" });
    doc.text("Refund", col.refund, tableTop, { width: 80, align: "right" });

    doc
      .moveTo(30, tableTop + 15)
      .lineTo(820, tableTop + 15)
      .stroke();

    // ================= ROWS =================
    let y = tableTop + 25;

    let totalAmount = 0;
    let totalRefund = 0;

    doc.font("Helvetica").fontSize(9);

    orders.forEach((order) => {
      let subTotal = 0;
      let refund = 0;

      order.orderedItems.forEach((item) => {
        const itemTotal = item.purchasedPrice * item.quantity;

        if (!["cancelled", "returned"].includes(item.itemStatus)) {
          subTotal += itemTotal;
        }

        if (item.itemStatus === "returned") {
          refund += calculateItemRefund(order, item);
        }
      });

      const tax = Math.round(subTotal * 0.05);
      const amount = subTotal + tax;

      // ================= PAGE BREAK =================
      if (y > 500) {
        doc.addPage({ layout: "landscape" });
        y = 50;
      }

      // ================= ROW DATA =================
      doc.text(order.orderNumber, col.order, y, {
        width: 120,
        ellipsis: true,
      });

      doc.text(moment(order.createdAt).format("YYYY-MM-DD"), col.date, y);
      doc.text(order.paymentMethod, col.payment, y);
      doc.text(order.orderStatus, col.status, y);

      doc.text(`₹${amount.toFixed(2)}`, col.amount, y, {
        width: 80,
        align: "right",
      });

      doc.text(`₹${refund.toFixed(2)}`, col.refund, y, {
        width: 80,
        align: "right",
      });

      y += 20;

      totalAmount += amount;
      totalRefund += refund;
    });

    // ================= FOOTER =================
    doc
      .moveTo(30, y)
      .lineTo(820, y)
      .stroke();

    y += 20;

    doc.font("Helvetica-Bold").fontSize(11);

    doc.text(`Total Orders: ${orders.length}`, 40, y);
    y += 15;

    doc.text(`Total Sales: ₹${totalAmount.toFixed(2)}`, 40, y);
    y += 15;

    doc.text(`Total Refund: ₹${totalRefund.toFixed(2)}`, 40, y);

    doc.end();
  } catch (error) {
    console.log(error);
    res.status(500).send("PDF generation error");
  }
};





export default {
  getSalesReport,
  downloadExcel,
  downloadPDF,
};