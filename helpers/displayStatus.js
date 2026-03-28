function getDisplayStatus(order) {

  if (order.paymentStatus === "failed") return "payment_failed";

  const hasReturnRequested = order.orderedItems.some(
    i => i.return && i.return.status === "requested"
  );
  if (hasReturnRequested) return "request_pending"; // display "requested" status

  const allReturned = order.orderedItems.every(
    i => i.itemStatus === "returned"
  );
  if (allReturned) return "returned";

  const allCancelled = order.orderedItems.every(
    i => i.itemStatus === "cancelled"
  );
  if (allCancelled) return "cancelled";

  const allReturnedOrCancelled = order.orderedItems.every(
    i => ["returned", "cancelled"].includes(i.itemStatus)
  );
  if (allReturnedOrCancelled) return "completed";

  const activeItems = order.orderedItems.filter(
    i => !["cancelled", "returned"].includes(i.itemStatus)
  );
  if (activeItems.some(i => i.itemStatus === "shipped")) return "shipped";
  if (activeItems.some(i => i.itemStatus === "processing")) return "processing";

  return "delivered";
}
export{
  getDisplayStatus
}