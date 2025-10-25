
const multer = require("multer");
const storage = multer.memoryStorage();
  
const upload = multer({ storage });

module.exports = upload;




// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// // Folder create ചെയ്യുക if not exists
// const uploadPath = path.join(__dirname, "..", "public", "uploads");
// if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
// }

// // Storage definition
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, uploadPath);
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + "-" + file.originalname);
//     }
// });

// // Multer instance export ചെയ്യുക
// const upload = multer({ storage });

// module.exports = upload;
