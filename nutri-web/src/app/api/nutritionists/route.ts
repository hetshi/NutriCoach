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

        const prompt = `
    You are a specialized local health directory assistant for India.
    Task: Identify 4-5 REAL, highly-rated, and currently active NUTRITIONISTS or DIETITIANS strictly categorized in "${city}".
    
    STRICT PRECISION RULES:
    1. EXCLUSIVITY: Only suggest Nutritionists/Dietitians with their own clinic or specialized practice. 
    2. LOCATION: You must provide a specific street address or building name (e.g., "123, MG Road, Above HDFC Bank"). Do not provide just the neighborhood name.
    3. SOCIAL PROOF: You MUST find and provide their real Instagram handle (e.g., @nutritionist_name). If you cannot find one, search for another expert who has one.
    4. NO GENERALISTS: Do not suggest general practitioners or hospitals.
    
    Format each result EXACTLY as shown below (no intro/outro):
    [FULL NAME] | [SPECIALITY] | [FULL STREET ADDRESS] | [INSTAGRAM HANDLE]
    
    Example:
    Dr. Anjali Mukerjee | Clinical Nutritionist | Health Total, Linking Road, Santacruz West | @anjalimukerjee
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
