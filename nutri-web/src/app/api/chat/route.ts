import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const { messages, user } = await req.json();
    const headersList = req.headers;
    const clientKey = headersList.get("x-api-key");

    const groq = new Groq({
      apiKey: clientKey || process.env.GROQ_API_KEY,
    });

    const dietType = user?.diet_type?.toUpperCase() || "VEG";
    const jainStopList = dietType === "JAIN" ? `
          !!! CRITICAL JAIN DIET DETECTED !!!
          - ABSOLUTELY NO ONIONS.
          - ABSOLUTELY NO GARLIC.
          - ABSOLUTELY NO POTATOES OR SWEET POTATOES.
          - ABSOLUTELY NO GINGER OR TURMERIC ROOT.
          - ABSOLUTELY NO CARROTS OR BEETROOTS.
          - ABSOLUTELY NO RADISH OR LEEKS.
          Total ban on all root vegetables. Use Lauki, Turai, Capsicum, Peas, Paneer, or Grains instead.` : "";

    const systemPrompt = `You are NutriCoach, a top-tier Indian Nutritionist. 
          ${jainStopList}
          
          MISSION: Provide crystal-clear, authentic Indian meal plans and health advice for: ${user?.name || "User"}.
          
          STRICT MEAL RULES:
          1. BREAKFAST OVERHAUL: Suggesting just "curd", "raita", or "fruit" as a meal is STRICTLY FORBIDDEN. Breakfast must be a SUBSTANTIAL Indian dish (e.g. Jain Poha, Chilla, Upma, Paratha).
          2. STRICT INVENTORY RULE: If the user provides a list of ingredients (Ingredient Book), you MUST ONLY use those ingredients. You are FORBIDDEN from adding extra primary ingredients (Vegetables, Proteins, Grains) that are not listed.
          3. DEFAULT PANTRY: You may assume the following are ALWAYS available: Basic Spices (Salt, Turmeric, Cumin, Chilli Powder, Hing, Garam Masala), Oil/Ghee, Water, Suger, and Salt.
          4. MEAL STRUCTURE: For every meal option, you MUST provide:
             - **Dish Name**: Descriptive and authentic (e.g. "Soya Keema Matar" instead of "Soya Mix").
             - **Ingredients**: Exact measurements with units (e.g. 1/2 cup, 200g, 1 tsp).
             - **Method**: Logical, numbered steps using traditional tools (Kadai, Tawa, Pressure Cooker).
             - **Watch Recipe**: [Watch Recipe](https://www.youtube.com/results?search_query=Dish+Name+Recipe).
          5. NO REPETITION: Core ingredients (e.g. Soya Chunks, Paneer, Dal) must NOT repeat more than twice in one day. Ensure variety.
          6. DIETARY ACCURACY: 
             - VEG/JAIN: No meat, eggs, or fish. 
             - JAIN: Zero tolerance for root vegetables listed above.
          
          Be professional, encouraging, and precise. Every word must count for clarity.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages,
      ],
      model: "llama-3.3-70b-versatile",
    });

    return NextResponse.json({ 
      content: completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that." 
    });
  } catch (error: any) {
    console.error("Groq API Error:", error);
    return NextResponse.json({ error: "Failed to connect to AI" }, { status: 500 });
  }
}
