const preventLogin = (req, res, next) => {
  if (req.session.user) {
 
    return res.redirect('/home');
  }
  next();
};

export { preventLogin};