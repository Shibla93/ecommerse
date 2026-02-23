const Wallet = require("../../model/walletSchema");
const User = require("../../model/userSchema");
const Messages = require("../../constants/messages");
const StatusCodes = require("../../constants/StatusCodes")

const getWallet = async (req, res) => {
  try {

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/login");
    }

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });

      await wallet.save();
    }

    res.render("wallet", {
      user,
      wallet,
      transactions: wallet.transactions || [],
      activePage: 'wallet'
    });

  } catch (error) {
    console.error("Wallet Error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false , message: Messages.INTERNAL_SERVER_ERROR });
  }
};


module.exports = { getWallet };
