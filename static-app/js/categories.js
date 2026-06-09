// Category tree: high-level -> subcategories (empty array = no sub)
window.CATEGORIES = {
  "Fixed Cost":     { color: "#6366f1", icon: "📌", sub: ["Phone Bill", "AI Subscription"] },
  "Daily Paid":     { color: "#22c55e", icon: "🍽️", sub: ["Food", "Drink", "Dessert", "Bakery", "Snack"] },
  "One-Time Paid":  { color: "#f59e0b", icon: "🛍️", sub: [] },
  "Parking Fee":    { color: "#06b6d4", icon: "🅿️", sub: [] },
  "Express Way Fee":{ color: "#0ea5e9", icon: "🛣️", sub: [] },
  "Invest":         { color: "#a855f7", icon: "📈", sub: ["Crypto", "Stock"] },
  "Savings":        { color: "#10b981", icon: "💰", sub: [] },
};
window.CATEGORY_NAMES = Object.keys(window.CATEGORIES);
