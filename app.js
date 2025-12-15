
const express=require("express");
const app=express();
const path=require("path")
const env=require("dotenv").config();
const session=require("express-session")
const MongoStore = require('connect-mongo');
const dbConnect=require("./config/db")
const userRouter = require("./routes/userRouter");
const adminRouter=require("./routes/adminRouter")
const passport = require("passport");
const Messages = require("./constants/messages");
require("./config/passport")
const flash = require("connect-flash");





app.use(express.json());
app.use(express.urlencoded({extended:true}))
// app.use(session({
//   secret:process.env.SESSION_SECRET,
//   resave:false,
//   saveUninitialized:false,
//   cookie:{
//     secure:false,
//     httpOnly:true,
//     maxAge:72*60*60*1000
//   }
// }))
app.use(
  session({
    secret:process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:process.env.MONGO_URI
    }),
    cookie: {
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);







app.use(flash());

// app.use((req, res, next) => {
//   res.locals.success = req.flash("success");
//   res.locals.error = req.flash("error");
//   next();
// });

app.use(passport.initialize())
app.use(passport.session())


app.set("view engine", "ejs");
app.set("views",[ path.join(__dirname, "views/user"),path.join(__dirname,'views/')]);
app.use(express.static(path.join(__dirname, 'public')));


app.use((req,res,next)=>{
  res.set('cache-control','no-store')
  next()
})
app.use("/",userRouter);
app.use("/admin",adminRouter)



app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  const view = req.originalUrl.startsWith("/admin") ? "admin/error" : "user/error";
  res.status(500).render(view, { message: err.message || Messages.INTERNAL_SERVER_ERROR });
  
});

dbConnect().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
});




module.exports=app;