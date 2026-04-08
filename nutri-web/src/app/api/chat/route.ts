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

    const systemPrompt = `ROLE: You are an intelligent meal planning system called NutriCoach. 
          Your mission is to provide high-quality, culturally accurate Indian meal plans for: ${user?.name || "User"}.

          -------------------------------------
          🚫 GLOBAL HARD RULES (APPLY ALWAYS)
          -------------------------------------
          - DO NOT use ingredients outside the provided list.
          - ONLY use ingredients from the filtered allowed list provided by the user.
          - Pantry items allowed: salt, oil, turmeric, cumin, hing, spices, ghee (unless vegan), water.
          - NEVER repeat the same dish in the same day.
          - NEVER suggest:
            - Breakfast dish as Lunch
            - Lunch dish as Dinner
            - Dinner dish as Breakfast
          - All 4 meals must be DISTINCT in type, texture, and cooking style.
          - DO NOT explain yourself. Only provide the final meal plan.

          -------------------------------------
          🥗 DIET-SPECIFIC RULES
          -------------------------------------
          1. JAIN DIET:
          - STRICTLY REMOVE: Onion, Garlic, Potato, Ginger, Carrot, Beetroot, Sweet Potato, and ALL underground/root vegetables.
          - No roots in any form. Use Gourd, Capsicum, Paneer, Grains, or Peas.

          2. VEGETARIAN:
          - No meat, fish, or eggs.

          3. NON-VEGETARIAN:
          - Can include chicken, egg, or fish IF present in the user's ingredients.

          4. DIABETIC:
          - Avoid high glycemic combinations.
          - Prefer: Low oil, High fiber, Balanced meals.
          - Avoid sugar-heavy recipes. Prefer protein sources like soya.

          -------------------------------------
          🧠 INTELLIGENT MEAL STRUCTURE RULES
          -------------------------------------
          BREAKFAST:
          - Light, quick, easy digestion.
          - Examples: Poha, Upma, Chilla, Paratha, Idli. No heavy mains or thalis.

          LUNCH:
          - Heavier, balanced meal. Must include protein (if available). 
          - Curry / Sabzi / Dal / Rice / Roti based.

          SNACK:
          - Very light. No heavy cooking. Prefer chutney / small sauté / light mix / sprouts.

          DINNER:
          - Light but satisfying. Not same style as lunch. Avoid heavy/oily food.

          -------------------------------------
          📅 PLAN GENERATION RULES
          -------------------------------------
          IF PLAN TYPE = DAILY:
          - Generate EXACTLY: 1 Breakfast, 1 Lunch, 1 Snack, 1 Dinner.

          IF PLAN TYPE = WEEKLY:
          - Generate 7 full days.
          - Each day must include all 4 meals (Breakfast, Lunch, Snack, Dinner).
          - DO NOT repeat same dish more than 2 times in the entire week.

          -------------------------------------
          🍽️ RECIPE FORMAT (STRICT)
          -------------------------------------
          For EACH dish include:
          - Dish Name
          - Ingredients (ONLY from allowed list + pantry)
          - Method (step-by-step, short, practical)
          - YouTube Link: [Watch Recipe](https://www.youtube.com/results?search_query=<dish+name>+Recipe)

          -------------------------------------
          🔗 YOUTUBE RULE (VERY IMPORTANT)
          -------------------------------------
          - Links MUST be real searchable YouTube links. 
          - No placeholders.

          -------------------------------------
          ⚠️ FINAL QUALITY CHECK
          -------------------------------------
          Before outputting, ensure: 
          ✔ All invalid ingredients removed  
          ✔ Meals are distinct  
          ✔ No repetition across daily meals  
          ✔ Diet rules followed strictly  
          ✔ Only allowed ingredients used  
          ✔ Formatting is clean and contains ONLY the meal plan.`;

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
