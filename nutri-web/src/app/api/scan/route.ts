import { NextResponse } from "next/server";
import Groq from "groq-sdk";
const pdf = require("pdf-parse"); // Using require to avoid potential TS import issues/type mismatches

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

        if (fileType === "application/pdf") {
            try {
                const pdfData = await pdf(buffer);
                const textContent = pdfData.text;

                if (!textContent || textContent.trim().length < 50) {
                    return NextResponse.json({ 
                        content: "This PDF looks like a scanned image. Please upload high-quality PHOTOS or SCREENSHOTS of the pages instead!" 
                    });
                }

                const response = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "user",
                            content: `Analyze this multi-page medical report text: ${textContent}. List abnormal values and suggest 3-4 specific dietary changes. Format: Abnormal: ... Suggestion: ...`
                        },
                    ],
                    model: "llama-3.3-70b-versatile",
                });

                return NextResponse.json({
                    content: response.choices[0]?.message?.content || "Could not analyze the PDF text."
                });
            } catch (pdfErr: any) {
                console.error("PDF Parsing error:", pdfErr);
                return NextResponse.json({ error: "Failed to parse PDF", details: pdfErr.message }, { status: 500 });
            }
        }

        const prompt = "Read all text from this image very carefully. Capture every item name, quantity, and health value you see. Return only the extracted text information.";
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
