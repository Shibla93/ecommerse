export const calculateItemRefund = (order, item) => {
  if (!order || !item) return 0;

  const itemTotal = item.purchasedPrice * item.quantity;

  const orderSubTotal = order.subTotal || 1; 

  // tax share
  const itemTaxShare =
    (itemTotal / orderSubTotal) * (order.tax || 0);

  // coupon share
  const itemCouponShare =
    (itemTotal / orderSubTotal) *
    (order.couponDiscount || 0);

  // offer share (IMPORTANT - missing before)
  const itemOfferShare =
    (itemTotal / orderSubTotal) *
    (order.offerDiscount || 0);

  // FINAL REFUND
  return Math.round(
    itemTotal + itemTaxShare - itemCouponShare 
   
  );
};