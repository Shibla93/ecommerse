import express from "express";
const router = express.Router();

import adminController from "../controllers/admin/adminController.js";
import { adminAuth } from "../middlewares/auth.js";
import userController from "../controllers/admin/userController.js";
import categoryController from "../controllers/admin/categoryController.js";
import brandController from "../controllers/admin/brandController.js";
import productController from "../controllers/admin/productController.js";
import orderController from "../controllers/admin/orderController.js";
import couponController from "../controllers/admin/couponController.js";
import offerController from "../controllers/admin/offerController.js";
import salesController from "../controllers/admin/salesController.js";

import upload from "../helpers/multer.js";
import cloudinary from "../helpers/cloudinary.js";
import { preventAdminLogin } from "../middlewares/preventAdminLogin.js";

router.get("/pageError",adminController.pageError)
router.get("/login",preventAdminLogin,adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
router.get('/dashboard-data',adminAuth, adminController.getDashboardData);
router.get("/logout",adminController.logout);
router.post("/logout",adminController.logout)


router.get("/customers",adminAuth,userController.getCustomer)
router.post("/customers/block/:id",adminAuth,userController.blockCustomer)


router.get("/category",adminAuth,categoryController.getCategory)
router.post("/category",adminAuth,categoryController.addCategory)
router.post("/category/list/:id",adminAuth,categoryController.listCategory)
router.put("/category/:id", adminAuth, categoryController.editCategory);
 router.put("/category/delete/:id",adminAuth,categoryController.deleteCategory)

router.get("/brand",adminAuth,brandController.getBrand)
router.post("/brand",adminAuth,brandController.addBrand)
router.post("/brand/block/:id",adminAuth, brandController.blockBrand);

router.get("/addproduct",adminAuth,productController.addproduct)
router.post("/addproduct", adminAuth,upload.any(),productController.createProduct)
router.get("/product",adminAuth,productController.getProduct)
router.patch("/product/list/:id/:variantId",adminAuth,productController.listProduct)
router.patch("/product/delete/:id/:variantId",adminAuth,productController.deleteProduct)
router.get("/product/edit/:id",adminAuth ,productController.getEditProduct);
router.patch("/product/edit/:id",adminAuth,upload.any(),productController.editProduct);

router.get('/order', adminAuth, orderController.listOrders);
router.post("/order/status/:orderId",adminAuth,orderController.updateOrderStatus);
router.get('/order/:orderId', adminAuth, orderController.viewOrder);
router.patch( "/order/item/approve/:orderId/:itemId", adminAuth,orderController.approveItem);
router.patch( "/order/item/reject/:orderId/:itemId", adminAuth, orderController.rejectItem);

router.get("/coupons", adminAuth, couponController.loadCouponList);
router.get("/coupons/create", adminAuth, couponController.loadCreateCoupon);
router.post("/coupons/create", adminAuth, couponController.createCoupon);
router.post("/coupons/:id/edit", adminAuth, couponController.updateCoupon);
router.post("/coupons/:id/delete", adminAuth, couponController.deleteCoupon);

router.get("/offers",adminAuth, offerController.getOffersPage);

// Create Offer
router.post("/offers/create", adminAuth,offerController.createOffer);

// Update Offer
router.post("/offers/update/:offerId",adminAuth, offerController.updateOffer);

// Delete Offer
router.get("/offers/delete/:id",adminAuth, offerController.deleteOffer);

router.get("/sales-report", adminAuth,salesController.getSalesReport)

router.get("/sales-report/download/pdf", adminAuth,salesController.downloadPDF);
 router.get("/sales-report/download/excel",adminAuth, salesController.downloadExcel);


export default router