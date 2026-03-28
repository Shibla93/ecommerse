const preventAdminLogin = (req, res, next) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  next();
};
export {preventAdminLogin};