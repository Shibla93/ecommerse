
import express from "express";
const app = express();

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

import session from "express-session";
import MongoStore from "connect-mongo";
import dbConnect from "./config/db.js";
import userRouter from "./routes/userRouter.js";
import adminRouter from "./routes/adminRouter.js";
import passport from "passport";
import "./config/passport.js"; // side-effect import for passport config
import setLocals from "./middlewares/setLocals.js";
import errorHandler from "./middlewares/errorHandler.js";
app.use(express.json());
app.use(express.urlencoded({extended:true}))

// 👉 USER SESSION
const userSession = session({
  name: "userSession", 
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "userSessions"
  }),
  cookie: {
    maxAge: 72 * 60 * 60 * 1000,
        path: "/"
  },
});

// 👉 ADMIN SESSION
const adminSession = session({
  name: "adminSession", 
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "adminSessions"
  }),
  cookie: {
    maxAge: 72 * 60 * 60 * 1000,
        path: "/admin"
  },
});
app.use(passport.initialize())
app.use(passport.session())


app.set("view engine", "ejs");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/")
]);
app.use(express.static(path.join(__dirname, 'public')));


app.use((req,res,next)=>{
  res.set('cache-control','no-store')
  next()
})

app.use("/admin",adminSession,adminRouter)
app.use("/",userSession,setLocals,userRouter);

app.use(errorHandler);
const PORT = process.env.PORT || 3000;
dbConnect().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
});



export default app;