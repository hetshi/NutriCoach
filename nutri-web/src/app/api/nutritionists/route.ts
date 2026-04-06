import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
    try {
        const { city } = await req.json();
        const headersList = req.headers;
        const clientKey = headersList.get("x-api-key");
        const groq = new Groq({
            apiKey: clientKey || process.env.GROQ_API_KEY,
        });

        const prompt = `You are a local health directory for India. List 4-5 REAL nutritionists/dietitians whose clinic is PHYSICALLY LOCATED IN "${city}", India.

ABSOLUTE RULES — NEVER BREAK THESE:
1. Every result MUST have their clinic physically inside "${city}". The word "${city}" MUST appear in the address field.
2. If you are not 100% sure a practitioner's office is in "${city}", DO NOT include them. Accuracy over quantity.
3. Do NOT include doctors whose clinic is in a different city (e.g., if asked for Vile Parle, don't include doctors from Delhi, Pune, etc.)
4. Include ONLY nutritionists/dietitians — not general physicians, homeopaths, or hospitals.
5. The address must be a real, specific street address with locality in ${city}.

FORMAT — output ONLY these lines, no other text:
Name | Specialty | Full Address in ${city} | Instagram handle or "N/A"

Example for "Vile Parle":
Dr. Pooja Shah | Sports Nutritionist | 12, Nehru Road, Vile Parle East, Mumbai | @drpoojashah_nutrition

Now list 4-5 real nutritionists physically based in ${city}:`;

        const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 600,
        });

        return NextResponse.json({
            content: response.choices[0]?.message?.content || "",
            city: city
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to search" }, { status: 500 });
    }
}
