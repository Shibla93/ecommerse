function getDisplayStatus(order) {
  const activeItems = order.orderedItems.filter(
    i => !["cancelled", "returned"].includes(i.itemStatus)
  );

  if (activeItems.length === 0) {
    return order.orderStatus;
  }

  if (activeItems.some(i => i.itemStatus === "shipped")) return "shipped";
  if (activeItems.some(i => i.itemStatus === "processing")) return "processing";

  return "delivered";
}

module.exports = { getDisplayStatus };