const express=require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middlewares/auth")
const userController=require("../controllers/admin/userController")
const categoryController=require("../controllers/admin/categoryController")
const brandController=require("../controllers/admin/brandController")
const productController=require("../controllers/admin/productController")

const upload = require('../helpers/multer'); 
const cloudinary = require('../helpers/cloudinary')


router.get("/pageError",adminController.pageError)
router.get("/login",adminController.loadLogin)
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

router.post("/product/edit/:id",adminAuth,upload.any(),productController.editProduct);






module.exports=router;