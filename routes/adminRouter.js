const express=require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {adminAuth}=require("../middlewares/auth")
const userController=require("../controllers/admin/userController")
const categoryController=require("../controllers/admin/categoryController")
const brandController=require("../controllers/admin/brandController")
const productController=require("../controllers/admin/productController")
const orderController=require("../controllers/admin/orderController")
const couponController=require("../controllers/admin/couponController")
const offerController = require("../controllers/admin/offerController");
const salesController = require("../controllers/admin/salesController");

const upload = require('../helpers/multer'); 
const cloudinary = require('../helpers/cloudinary')
const {preventAdminLogin} = require('../middlewares/preventAdminLogin');

router.get("/pageError",adminController.pageError)
router.get("/login",preventAdminLogin,adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/dashboard",adminAuth,adminController.loadDashboard)
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



router.get("/sales-report", adminAuth,salesController.getSalesReport);
router.get("/sales-report/download/pdf", adminAuth,salesController.downloadPDF);
 router.get("/sales-report/download/excel",adminAuth, salesController.downloadExcel);


module.exports=router;