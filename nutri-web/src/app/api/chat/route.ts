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
          - ABSOLUTELY NO ONIONS, GARLIC, OR POTATOES.
          - NO GINGER, TURMERIC ROOT, CARROTS, BEETROOTS, RADISH.
          - Total ban on all root vegetables. Use Lauki, Capsicum, Paneer, or Grains.` : "";
    
    const veganStopList = dietType === "VEGAN" ? `
          !!! CRITICAL VEGAN DIET DETECTED !!!
          - NO DAIRY (Milk, Curd, Ghee, Paneer, Butter).
          - NO HONEY.
          - Use ONLY plant-based ingredients.` : "";

    const systemPrompt = `You are NutriCoach, the most precise and culturally accurate AI Indian Nutritionist.
          ${jainStopList}
          ${veganStopList}
          
          MISSION: Provide perfectly structured, authentic Indian meal plans for: ${user?.name || "User"}.
          
          RULE 1: STRICT INVENTORY (TOP PRIORITY)
          - Use ONLY the primary ingredients (vegetables, grains, proteins) listed by the user. 
          - DO NOT hallucinate or suggest extra vegetables or proteins (e.g., if Paneer is NOT in the list, do NOT suggest it).
          - PANTRY BASICS ALLOWED: Salt, Spices (Haldi, Chilli, Jeera, etc.), Oil, Ghee (unless Vegan), Water.

          RULE 2: AUTHENTIC MEAL TIMING
          - BREAKFAST: Suggest substantial breakfast items ONLY (e.g. Poha, Chilla, Upma, Paratha, Idli). 
          - LUNCH/DINNER: Suggest substantial main meals ONLY (e.g. Sabzi, Roti, Dal, Rice, Thali).
          - DO NOT suggest "Lunch/Dinner" items (like heavy Gravy Sabzi or Khichdi) for Breakfast unless it's a specific Breakfast variant.
          - Suggesting "only curd" or "only fruit" for breakfast is FORBIDDEN.

          RULE 3: CATEGORY ACCURACY
          - JAIN: Absolute zero tolerance for root vegetables.
          - VEG: No meat, eggs, or fish.
          - VEGAN: No animal products whatsoever (includes milk/honey).
          - DIABETIC: Prioritize Low GI ingredients. No added sugar.

          RULE 4: OUTPUT STRUCTURE (MANDATORY)
          Each meal option MUST include:
          - **Dish Name**: Authentic Indian name.
          - **Ingredients**: Exact measurements (e.g. 200g, 1/2 cup).
          - **Method**: Logical, numbered steps using traditional tools (Kadai, Tawa, etc.).
          - **Watch Recipe**: [Watch Recipe Link].

          Be encouraging, concise, and professional. Every instruction must be crystal clear.`;

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
