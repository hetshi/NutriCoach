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
                // modern fallback for pdf-parse module interop
                let pdfModule = require("pdf-parse");
                let pdf = pdfModule.PDFParse || pdfModule.default || (typeof pdfModule === "function" ? pdfModule : null);
                
                console.log("PDF Parser Loaded. Keys:", Object.keys(pdfModule), "Type:", typeof pdf);
                if (typeof pdf !== "function") {
                    throw new Error("Internal PDF Parser Error: Expected function but got " + typeof pdf + ". Keys: " + Object.keys(pdfModule).join(","));
                }

                const pdfData = await pdf(buffer);
                const textContent = pdfData.text;

                if (!textContent || textContent.trim().length < 50) {
                    return NextResponse.json({ 
                        success: false,
                        scan_text: "This PDF appears to be a scanned image or has very little text. For best results, please upload a clear PHOTO or SCREENSHOT of the report instead.",
                        debug_info: "PDF_TEXT_TOO_SHORT"
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
                    success: true,
                    scan_text: response.choices[0]?.message?.content || "The AI could not analyze the PDF text.",
                    debug_info: "PDF_SUCCESS"
                });
            } catch (pdfErr: any) {
                console.error("PDF Parsing error:", pdfErr);
                return NextResponse.json({ error: "Failed to parse PDF", details: pdfErr.message }, { status: 500 });
            }
        }

        const isReport = type === "report";
        const prompt = isReport 
            ? "Analyze this medical report image. Extract patient name, test dates, and specifically point out abnormal values (high/low) and their significance. Summarize in plain English."
            : "Look at this grocery bill or receipt image. Extract ONLY the product/item names. Output them as a simple comma-separated list with no extra text, no quantities, no prices, no amounts, no explanations — just the item names separated by commas.";

        console.log("Sending to Groq Vision model...");
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: isReport
                        ? "You are a medical report analyzer. Be concise and clear."
                        : "You are a receipt scanner. Your ONLY job is to output a plain comma-separated list of item names from the receipt. No thinking. No explanations. No bullet points. No numbering. No quantities. No prices. Just item names separated by commas."
                },
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
            model: "qwen/qwen3.6-27b",
            reasoning_format: "hidden",
        });
        console.log("Groq Scan Response Received successfully.");
        console.log("Full Message Data:", JSON.stringify(response.choices[0].message));

        // Strip <think>...</think> reasoning blocks
        let rawContent = (response.choices[0]?.message?.content || "")
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .trim();

        // For bill scans: robustly extract ONLY the item names
        if (!isReport) {
            const lines = rawContent.split(/\n+/).map(l => l.trim()).filter(Boolean);

            // Find lines that look like a clean comma-separated list (no colons, no markdown)
            const cleanLines = lines.filter(line => {
                const stripped = line.replace(/[*•\-\d\.\[\]]/g, "").trim();
                return (
                    stripped.includes(",") &&
                    !stripped.includes(":") &&
                    !stripped.toLowerCase().includes("based on") &&
                    !stripped.toLowerCase().includes("here are") &&
                    !stripped.toLowerCase().includes("note") &&
                    stripped.length > 5
                );
            });

            if (cleanLines.length > 0) {
                // Take the longest clean comma-separated line (most complete item list)
                rawContent = cleanLines
                    .sort((a, b) => b.length - a.length)[0]
                    .replace(/[*•\-]/g, "")
                    .replace(/\s*\.\s*/g, ", ")
                    .replace(/,\s*,/g, ",")
                    .trim()
                    .replace(/^,|,$/g, "");
            } else {
                // Fallback: aggressive cleanup of entire response
                rawContent = rawContent
                    .replace(/\*\*/g, "")
                    .replace(/\n+/g, ", ")
                    .replace(/\d+\.\s*/g, "")
                    .replace(/[*•\-]\s*/g, "")
                    .replace(/[A-Za-z ]+:[^,]*/g, "")
                    .replace(/,\s*,/g, ",")
                    .trim()
                    .replace(/^,|,$/g, "");
            }
        }
        console.log("Processed Content Length:", rawContent.length);

        if (rawContent.length < 10) {
            console.warn("AI response too short, returning diagnostic.");
            return NextResponse.json({ 
                success: false,
                scan_text: "The AI saw the photo but couldn't extract enough readable information. (Code: AI_EMPTY)",
                debug_info: "AI_CONTENT_SHORT",
                original_response: rawContent
            });
        }

        return NextResponse.json({
            success: true,
            scan_text: rawContent,
            debug_info: "SUCCESS"
        });
    } catch (error: any) {
        console.error("Extraction Error:", error);
        return NextResponse.json({ 
            success: false,
            scan_text: "SERVER ERROR: " + (error.message || "Unknown Failure"),
            debug_info: "BACKEND_CATCH_ERROR",
            details: error.response?.data?.error?.message || error.message || "Unknown AI error"
        }, { status: 500 });
    }
}
