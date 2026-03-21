import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
    try {
        const { city } = await req.json();
        const headersList = req.headers;
        const clientKey = headersList.get("x-api-key");
        const hardcodedKey = "gsk_BTNkhS7oz5zzagsUOCI8WGdyb3FYEqRw9R1YYL8QZKErTv4Hje5cos";

        const groq = new Groq({
            apiKey: clientKey || process.env.GROQ_API_KEY || hardcodedKey,
        });

        const prompt = `
    You are a specialized local health assistant for India.
    Task: Identify 4-5 REAL, highly-rated, and currently active NUTRITIONISTS or DIETITIANS strictly in "${city}".
    
    STRICT LOCALITY ENFORCEMENT:
    - If the user provides a specific neighborhood/suburb (e.g., Andheri, Bandra, Powai), you MUST only suggest experts located WITHIN that specific neighborhood. 
    - DO NOT suggest experts from other nearby areas if it violates the "strictly in ${city}" rule.
    - Focus on professionals who have a physical clinic or verifiable practice in "${city}".

    STRICT FILTERING RULES:
    1. ONLY suggest dedicated Nutritionists or Dietitians.
    2. DO NOT suggest general doctors or multi-specialty hospitals unless they have a very prominent nutrition department.
    3. EXCLUDE gyms or general fitness centers.
    
    For each, provide:
    1. Full Name (Dr. name or Clinic name)
    2. Specialist Type (e.g., Clinical Dietitian, Sports Nutritionist)
    3. Precise Neighborhood/Street in ${city}
    4. Notable Achievement (e.g., "Active on Instagram", "Expert in PCOD").
    
    Format each result exactly:
    - [NAME] | [SPECIALITY] | [PRECISE AREA] | [NOTABLE]
    
    ONLY return the list. No introduction or closing text.
    `;

        const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
        });

        return NextResponse.json({
            content: response.choices[0]?.message?.content || ""
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to search" }, { status: 500 });
    }
}
