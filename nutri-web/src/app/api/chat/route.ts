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
          1. INVENTORY-ONLY COOKING: Use ONLY the primary ingredients provided by the user. DO NOT suggest Paneer, Chicken, or vegetables that are NOT in their list.
          2. PANTRY EXCEPTION: Assume basic masalas (Salt, Haldi, Jeera, Chilli powder, Hing), Oil, Ghee, and Water are always available.
          3. BREAKFAST OVERHAUL: Suggesting just "curd" or "fruit" for breakfast is STRICTLY FORBIDDEN. Breakfast must be a SUBSTANTIAL Indian dish using provided ingredients.
          4. NO REPETITION: Core ingredients (e.g. Soya Chunks, Paneer, Dal) must NOT repeat more than twice in one day.
          
          MEAL STRUCTURE: For every meal option, you MUST provide:
             - **Dish Name**: Authentic (e.g. "Soya Keema Matar").
             - **Ingredients**: Exact measurements with units.
             - **Method**: Numbered steps using traditional tools (Kadai, Tawa, etc.).
             - **Watch Recipe**: [Watch Recipe Link].
          
          DIETARY ACCURACY: 
             - VEG/JAIN: No meat, eggs, or fish. 
             - JAIN: Zero tolerance for root vegetables (Onion, Garlic, Potato, Ginger, Carrot, etc.).
          
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
