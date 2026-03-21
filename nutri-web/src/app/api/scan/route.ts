import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const headersList = req.headers;
        const clientKey = headersList.get("x-api-key");
        const hardcodedKey = "gsk_BTNkhS7oz5zzagsUOCI8WGdyb3FYEqRw9R1YYL8QZKErTv4Hje5cos";

        const groq = new Groq({
            apiKey: clientKey || process.env.GROQ_API_KEY || hardcodedKey,
        });
        const file = formData.get("file") as File;
        const type = formData.get("type"); // 'bill' or 'report'

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64");
        const fileType = file.type || "image/jpeg";

        const prompt = type === "bill"
            ? "OCR and analyze this grocery bill. List all items as a comma-separated list. Be extremely detailed. Only return the list."
            : "Detailed medical analysis: List abnormal values and suggest 3 dietary changes for a nutritionist. Format: Abnormal: ... Suggestion: ...";

        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${fileType};base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            model: "llama-3.2-90b-vision-preview",
        });

        return NextResponse.json({
            content: response.choices[0]?.message?.content || "Could not extract data."
        });
    } catch (error: any) {
        console.error("Extraction Error:", error);
        return NextResponse.json({ 
            error: "Failed to scan file", 
            details: error.message || "Unknown AI error"
        }, { status: 500 });
    }
}
