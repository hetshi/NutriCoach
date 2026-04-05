import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

// Polyfill DOMMatrix for PDF parsing in Node environment during build/runtime
if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() {}
    };
}
// const pdf = require("pdf-parse"); // Using require to avoid potential TS import issues/type mismatches

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const headersList = req.headers;
        const clientKey = headersList.get("x-api-key");

        const groq = new Groq({
            apiKey: clientKey || process.env.GROQ_API_KEY,
        });
        const file = formData.get("file") as File;
        const type = formData.get("type") as string; // 'bill' or 'report'
        console.log("Scan Request Received. Type:", type, "File Name:", file?.name, "File Type:", file?.type);

        if (!file) {
            console.error("Scan Error: No file uploaded");
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = buffer.toString("base64");
        const fileType = file.type || "image/jpeg";

        if (fileType === "application/pdf") {
            try {
                // lazy load pdf-parse to avoid build errors
                const pdf = require("pdf-parse");
                const pdfData = await pdf(buffer);
                const textContent = pdfData.text;

                if (!textContent || textContent.trim().length < 50) {
                    return NextResponse.json({ 
                        content: "This PDF appears to be a scanned image or has very little text. For best results, please upload a clear PHOTO or SCREENSHOT of the report instead, or ensure the PDF is text-searchable." 
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

        const isReport = type === "report";
        const prompt = isReport 
            ? "Analyze this medical report image. Extract patient name, test dates, and specifically point out abnormal values (high/low) and their significance. Summarize in plain English."
            : "Read all text from this grocery bill/receipt very carefully. Capture every item name, quantity, and health value you see. List only the extracted items.";

        console.log("Sending to Groq Llama 4 Scout Vision model...");
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
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
        });
        console.log("Groq Scan Response Received successfully.");

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
