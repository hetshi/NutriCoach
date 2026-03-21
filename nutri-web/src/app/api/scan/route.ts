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

        const prompt = "Transcribe all text from this image. If it's a grocery bill, list the items. If it's a medical report, extract the key values and recommendations.";

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
            model: "llama-3.2-11b-vision-preview",
        });

        const rawContent = response.choices[0]?.message?.content || "";
        console.log("Raw Vision Response:", rawContent);

        return NextResponse.json({
            content: rawContent || "The AI could not read any text from this image. Please try a clearer or smaller photo."
        });
    } catch (error: any) {
        console.error("Extraction Error:", error);
        return NextResponse.json({ 
            error: "Failed to scan file", 
            details: error.response?.data?.error?.message || error.message || "Unknown AI error"
        }, { status: 500 });
    }
}
