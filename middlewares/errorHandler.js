const Messages = require('../constants/messages');
const StatusCodes = require("../constants/StatusCodes");
module.exports = (err, req, res, next) => {
  const view = req.originalUrl.startsWith("/admin")
    ? "admin/error"
    : "user/error";

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).render(view, {
    message: err.message || Messages.INTERNAL_SERVER_ERROR
  });
};
