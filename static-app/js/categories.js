// Category tree with lucide icon names (no emoji)
window.CATEGORIES = {
  "Fixed Cost":      { color: "#6366f1", icon: "pin",          sub: ["Phone Bill", "AI Subscription"] },
  "Daily Paid":      { color: "#22c55e", icon: "utensils",     sub: ["Food", "Drink", "Dessert", "Bakery", "Snack"] },
  "One-Time Paid":   { color: "#f59e0b", icon: "shopping-bag", sub: [] },
  "Parking Fee":     { color: "#06b6d4", icon: "square-parking", sub: [] },
  "Express Way Fee": { color: "#0ea5e9", icon: "milestone",    sub: [] },
  "Invest":          { color: "#a855f7", icon: "trending-up",  sub: ["Crypto", "Stock"] },
  "Savings":         { color: "#10b981", icon: "piggy-bank",   sub: [] },
};
window.CATEGORY_NAMES = Object.keys(window.CATEGORIES);
