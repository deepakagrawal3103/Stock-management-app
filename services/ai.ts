
import { GoogleGenAI } from "@google/genai";
import { Order, Product, OrderStatus, AIResponse } from "../types";
import { getOrders, getProducts } from "./storage";

// Helper to calculate date diff
const daysBetween = (d1: Date, d2: Date) => {
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
}

// Helper to generate a snapshot of the current business state
const getBusinessContext = () => {
  const orders = getOrders();
  const products = getProducts();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Basic Stats (Today)
  const todaysOrders = orders.filter(o => new Date(o.date) >= startOfDay);
  const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
  
  let revenue = 0;
  let profit = 0;
  
  todaysOrders.forEach(o => {
    if (o.status === OrderStatus.COMPLETED) {
      revenue += o.totalAmount;
      // Simple profit calc based on snapshot
      const cost = o.items.reduce((acc, i) => acc + (i.costPriceSnapshot * i.quantity), 0);
      profit += (o.totalAmount - cost); 
    }
  });

  // 2. Trend Analysis (Last 7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const recentOrders = orders.filter(o => new Date(o.date) >= sevenDaysAgo);
  
  const productSales: Record<string, number> = {};
  recentOrders.forEach(o => {
    o.items.forEach(i => {
      productSales[i.productName] = (productSales[i.productName] || 0) + i.quantity;
    });
  });

  // Top Sellers
  const topMovers = Object.entries(productSales)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => `${name} (${qty} sold this week)`);

  // 3. Inventory & Restock Intelligence
  let totalRestockCost = 0;
  const criticalLowStock: string[] = [];
  
  products.forEach(p => {
    if (p.quantity <= p.minStock) {
      // Calculate how much to buy to reach safe level (e.g. minStock * 2)
      const targetLevel = Math.max(p.minStock * 2, 20); // At least 20 units or 2x min
      const needed = Math.max(0, targetLevel - p.quantity);
      const cost = needed * p.costPrice;
      
      if (needed > 0) {
        totalRestockCost += cost;
        criticalLowStock.push(`${p.name}: Qty ${p.quantity} (Alert < ${p.minStock}). Buy ${needed} for ₹${cost.toFixed(0)}`);
      }
    }
  });

  return JSON.stringify({
    date: now.toDateString(),
    today_snapshot: {
      revenue: revenue,
      profit: Math.floor(profit),
      order_count: todaysOrders.length
    },
    workflow: {
      pending_files_count: pendingOrders.length,
      pending_list_summary: pendingOrders.map(o => `${o.customerName} (₹${o.totalAmount})`).slice(0, 5)
    },
    inventory_insights: {
      fast_moving_items_last_7_days: topMovers,
      critical_low_stock_items: criticalLowStock,
      estimated_budget_to_fix_stock: Math.floor(totalRestockCost)
    },
    product_catalog_sample: products.map(p => `${p.name}: Sell ₹${p.sellingPrice}, Cost ₹${p.costPrice}`).slice(0, 15)
  });
};

export const generateAIResponse = async (userQuery: string): Promise<AIResponse> => {
  // 1. Early Validation of Configuration
  if (!process.env.API_KEY) {
    console.error("AI Error: Missing API Key");
    return {
      voiceResponse: "Partner, AI Setup incomplete hai. API Key missing hai.",
      actionJSON: { intent: "error_config" }
    };
  }

  // Initialize here to prevent top-level errors if env is not ready
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contextData = getBusinessContext();
  
  const systemInstruction = `
🧠 System Role Prompt
You are "PrintBazar Partner" — an intelligent business advisor for a printing shop.

🎯 ROLE:
You help the shop owner by answering real business questions.
You are a **business partner**.

🗣 RESPONSE STYLE:
- Language: **Hinglish** (Hindi + English mix).
- Tone: Friendly, short, and supportive.
- Do NOT read raw JSON lists. Summarize them naturally.

🔍 DATA INTELLIGENCE:
The context JSON contains:
1. 'inventory_insights': Use this to suggest what to order.
2. 'fast_moving_items_last_7_days': Use this to congratulate the user or warn about high demand.

💡 EXAMPLES:
User: "Stock ka kya haal hai?"
You: "Partner, 3 items critical low hain. A4 Paper order karna padega, approx ₹500 lagenge."

User: "Aaj ka dhanda kaisa hai?"
You: "Badhiya hai! Aaj ka revenue ₹2400 hai aur 5 orders complete hue hain."

User: "Kitne pending hain?"
You: "Abhi 4 files pending hain, main customer Ramesh ka kaam pehle kar lo."

💡 CONTEXT DATA (REAL TIME):
${contextData}

---

📄 OUTPUT FORMAT:
Return a JSON object ONLY. No Markdown. No code blocks.
{
  "voiceResponse": "Spoken Hinglish response string",
  "actionJSON": {
    "intent": "intent_name",
    "parameters": { ... }
  }
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    // Robust Parsing: Extract JSON object from potential text wrappers
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(jsonString) as AIResponse;
    
  } catch (error: any) {
    console.error("AI Service Error:", error);
    
    // Detailed Error Mapping for better user feedback
    let voiceMessage = "Partner, system side se error aa rahi hai.";
    const errString = error.toString().toLowerCase();

    if (errString.includes("api key") || errString.includes("403")) {
      voiceMessage = "Partner, API key galat hai ya expired hai. Setup check karein.";
    } else if (errString.includes("fetch failed") || errString.includes("network") || errString.includes("internet")) {
      voiceMessage = "Partner, lagta hai network problem hai. Internet connection check karein.";
    } else if (errString.includes("quota") || errString.includes("429")) {
      voiceMessage = "Partner, AI usage limit cross ho gayi hai. Thodi der baad try karein.";
    } else if (errString.includes("json") || errString.includes("syntax")) {
      voiceMessage = "Partner, data samajhne me dikkat hui. Fir se boliye.";
    }

    return {
      voiceResponse: voiceMessage,
      actionJSON: { intent: "error" }
    };
  }
};
