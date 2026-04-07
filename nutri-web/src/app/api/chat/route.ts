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

    const systemPrompt = `You are NutriCoach, a high-end AI Indian Nutritionist. 
          Your goal is to provide precise, practical, and culturally accurate Indian meal plans and health advice for your client: ${user?.name || "User"}.
          
          CLIENT PROFILE:
          - Age: ${user?.age || "N/A"}
          - Height: ${user?.height || "N/A"} cm
          - Weight: ${user?.weight || "N/A"} kg
          - Diet: ${user?.diet_type?.toUpperCase() || "VEG"}
          - Goal: ${user?.goal || "Healthy Lifestyle"}
          - Medical Advice: ${user?.health_advisor || "None"}
          
          RULES:
          1. Use ONLY provided safe ingredients if the user lists them.
          2. Prioritize authentic Indian home cooking (Tawa, Pressure Cooker, Kadai).
          3. Be culturally accurate with meals! NEVER suggest plain rice or heavy rice bowls for breakfast. Breakfast should be authentic Indian items like Poha, Upma, Idli, Dosa, Paratha, Chilla, or Oats.
          4. Snacks should be substantial and healthy (e.g., Roasted Makhana, Chana, Sprouts, Fruits with Nuts). Do NOT suggest just a bowl of raita or curd as a standalone snack.
          5. Ensure meals are balanced with proteins, carbs, and fats appropriate for the user's goal.
          6. Be encouraging and concise.
          7. Suggest YouTube recipe links in the format: [Watch Recipe](https://www.youtube.com/results?search_query=Dish+Name+Recipe)
          8. If asked for a meal plan, always provide ingredients and a short method.`;

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
