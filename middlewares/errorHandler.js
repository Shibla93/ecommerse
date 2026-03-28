import Messages from '../constants/messages.js';
import StatusCodes from '../constants/StatusCodes.js';
export default (err, req, res, next) => {
  const view = req.originalUrl.startsWith("/admin")
    ? "admin/error"
    : "user/error";

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).render(view, {
    message: err.message || Messages.INTERNAL_SERVER_ERROR
  });
};
