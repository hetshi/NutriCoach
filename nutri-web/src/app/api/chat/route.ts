import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, user } = await req.json();

    const systemPrompt = `You are NutriCoach, a high-end AI Indian Nutritionist. 
          Your goal is to provide precise, practical, and highly visual meal plans and health advice for your client: ${user?.name || "User"}.
          
          CLIENT PROFILE:
          - Age: ${user?.age || "N/A"}
          - Height: ${user?.height || "N/A"} cm
          - Weight: ${user?.weight || "N/A"} kg
          - Diet: ${user?.diet_type?.toUpperCase() || "VEG"}
          - Goal: ${user?.goal || "Healthy Lifestyle"}
          - Medical Advice: ${user?.health_advisor || "None"}
          
          RULES:
          1. Use ONLY provided safe ingredients if the user lists them.
          2. Prioritize Indian home cooking (Tawa, Pressure Cooker, Kadai).
          3. Be encouraging and concise.
          4. Suggest YouTube recipe links in the format: [Watch Recipe](https://www.youtube.com/results?search_query=Dish+Name+Recipe)
          5. If asked for a meal plan, always provide ingredients and a short method.`;

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
