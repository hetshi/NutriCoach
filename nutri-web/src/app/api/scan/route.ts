import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const headersList = req.headers;
        const clientKey = headersList.get("x-api-key");

        const groq = new Groq({
            apiKey: clientKey || process.env.GROQ_API_KEY,
        });
        const file = formData.get("file") as File;
        const type = formData.get("type"); // 'bill' or 'report'

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64");

        const prompt = type === "bill"
            ? "Extract a comma-separated list of ingredients from this grocery bill. Only return the list."
            : "Summary of this medical report in 3 clear bullet points for a nutritionist.";

        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            model: "llama-3.2-11b-vision-preview", // Vision model
        });

        return NextResponse.json({
            content: response.choices[0]?.message?.content || "Could not extract data."
        });
    } catch (error: any) {
        console.error("Extraction Error:", error);
        return NextResponse.json({ error: "Failed to scan file" }, { status: 500 });
    }
}
