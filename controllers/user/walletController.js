import Wallet from "../../model/walletSchema.js";
import User from "../../model/userSchema.js";
import Messages from "../../constants/messages.js";
import StatusCodes from "../../constants/StatusCodes.js";

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

    const transactions = wallet.transactions.sort(
  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
);
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


const walletController={ getWallet };
export default walletController