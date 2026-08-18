import sys
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "NutriCoach — Technical Architecture & Feature Specification")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
        
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "Confidential — NutriCoach Documentation")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0284C7"),
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=16,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8
    )

    bold_body_style = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A")
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#1E293B")
    )
    
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=8
    )

    elements = []
    
    # Title & Subtitle
    elements.append(Paragraph("NutriCoach Specification", title_style))
    elements.append(Paragraph("Features, Tools Used, and System Framework (Sections 4, 5 & 6)", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceAfter=15))
    
    # Section 4
    elements.append(Paragraph("4. Features of your Application", h1_style))
    elements.append(Paragraph(
        "The finalized feature set for <b>NutriCoach</b>, along with the specific LLM assigned to each feature via the Groq inference API, is summarized in <b>Table 2</b>.",
        body_style
    ))
    
    elements.append(Paragraph("Table 2. Feature-to-model mapping", h2_style))
    
    # Table Data
    table_data = [
        [
            Paragraph("Feature", table_header_style),
            Paragraph("Model Used", table_header_style),
            Paragraph("Function", table_header_style)
        ],
        [
            Paragraph("Nutritional AI Chat", table_cell_bold),
            Paragraph("Llama 3.3 70B Versatile (Groq)", table_cell_style),
            Paragraph("Conversational core for nutrition Q&A, dietary advice, dish suggestions, and culinary guidance.", table_cell_style)
        ],
        [
            Paragraph("Smart Meal Planner", table_cell_bold),
            Paragraph("Llama 3.3 70B Versatile (Groq)", table_cell_style),
            Paragraph("Generates customized daily and weekly Indian meal plans conforming to strict dietary filters (Veg, Jain, Vegan, Diabetic).", table_cell_style)
        ],
        [
            Paragraph("Medical Report Analyzer", table_cell_bold),
            Paragraph("Llama 3.3 70B & Llama 4 Scout / 90B Vision (Groq)", table_cell_style),
            Paragraph("Parses medical report PDFs and images, flags abnormal biomarkers, and suggests corrective dietary changes.", table_cell_style)
        ],
        [
            Paragraph("Grocery Bill & Receipt Scanner", table_cell_bold),
            Paragraph("Llama 4 Scout / 90B Vision (Groq)", table_cell_style),
            Paragraph("Scans grocery receipts and food packaging images to extract bought items, nutrition information, and ingredient lists.", table_cell_style)
        ],
        [
            Paragraph("Virtual Dietitian Matcher", table_cell_bold),
            Paragraph("Llama 3.3 70B Versatile (Groq)", table_cell_style),
            Paragraph("Evaluates user dietary requirements, health goals, and medical flags to recommend suitable nutritionist consultations.", table_cell_style)
        ],
        [
            Paragraph("Calorie & Macro Calculator", table_cell_bold),
            Paragraph("Mostly local Python/TypeScript logic <i>(LLM for personalization)</i>", table_cell_style),
            Paragraph("Deterministic BMR/TDEE calculation and macronutrient goal calculation with LLM-generated personalized diet tips.", table_cell_style)
        ]
    ]
    
    # Table layout: total width = 504 pt (letter width 612 - 108 margins)
    col_widths = [120, 144, 240]
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 10))
    
    p_exp = Paragraph(
        "<b>Llama 3.3 70B Versatile</b> (served via Groq) is used as the primary reasoning model for text-based conversational features and meal plan synthesis due to its strong instruction-following capabilities, low-latency LPU inference, and high domain knowledge in health and dietetics. <b>Llama 4 Scout / 3.2 90B Vision</b> is leveraged for visual extraction tasks such as reading text from scanned medical lab reports and handwritten/printed grocery receipts. The <b>Calorie & Macro Calculator</b> keeps its mathematical engine deterministic (BMR/Harris-Benedict formulas) to ensure complete accuracy, invoking the LLM only to format human-readable recommendations.",
        body_style
    )
    elements.append(p_exp)
    elements.append(Spacer(1, 10))
    
    # Section 5
    elements.append(Paragraph("5. Tools Used", h1_style))
    
    tools = [
        ("Frontend", [
            ("Next.js 16 (App Router) & React 19", "Modern web framework used to render the high-performance, multi-page application with Server Components and API routing."),
            ("Tailwind CSS 4 & Vanilla CSS", "Utility framework combined with custom CSS for responsive layouts, dark themes, and frosted glassmorphism visuals."),
            ("Framer Motion 12", "Motion library providing UI transition animations, interactive modal entries, and interactive hover effects."),
            ("Lucide React", "Consistent SVG icon set used across health metrics, macro tracking, and navigation interfaces."),
            ("PyQt6 (Legacy Desktop)", "Native desktop GUI framework for local offline desktop deployment.")
        ]),
        ("Backend / Database", [
            ("TypeScript / Node.js 20+", "Handles serverless API routes (/api/chat, /api/scan), input validation, diet rule enforcement, and Groq SDK orchestration."),
            ("Python 3.10+", "Core business logic, legacy desktop engine, and local deterministic health metric calculators."),
            ("Browser localStorage", "Privacy-first client-side data persistence for storing diet targets, user profiles, pantry inventory, and meal plans locally on the user's device."),
            ("SQLite3 (Legacy Desktop)", "Lightweight embedded relational database engine (nutricoach.db) for offline desktop history storage.")
        ]),
        ("LLM Inference", [
            ("Groq API", "High-speed AI inference host leveraging LPU (Language Processing Unit) hardware."),
            ("Llama 3.3 70B Versatile", "Primary LLM for nutritional reasoning, structured meal generation, and medical PDF summary analysis."),
            ("Llama 4 Scout / 3.2 90B Vision", "Multimodal vision model for visual OCR and extraction from medical documents and grocery receipts.")
        ]),
        ("Supporting Libraries", [
            ("pdf-parse", "Node.js parsing utility used to extract text streams from multi-page medical PDF reports before passing context to the Groq API."),
            ("groq-sdk", "Official Node.js SDK for managing Groq API connections, parameter handling, and completion streaming.")
        ])
    ]
    
    for category, items in tools:
        elements.append(Paragraph(category, h2_style))
        for tool_name, desc in items:
            bullet_p = Paragraph(f"• <b>{tool_name}</b> – {desc}", body_style)
            elements.append(bullet_p)
        elements.append(Spacer(1, 4))
    
    elements.append(Spacer(1, 10))
    
    # Section 6
    elements.append(Paragraph("6. Basic Framework", h1_style))
    elements.append(Paragraph("NutriCoach follows a modular three-layer architecture:", body_style))
    
    layers = [
        ("1. Presentation Layer", "Next.js 16 (React 19) renders the interactive Glassmorphism UI (Meal Planner, Document Scanner, AI Chat, Macro Tracker) and captures user input (diet preferences, text prompts, image/PDF uploads)."),
        ("2. Application Layer", "Serverless Next.js API Routes (/api/chat, /api/scan) act as the feature router. It retrieves user dietary rules (e.g., Jain root vegetable bans, Vegan restrictions, Diabetic glycemic limits), structures strict prompt templates, and invokes the appropriate Groq LLM (Llama 3.3 70B or Llama Vision)."),
        ("3. Data Layer", "Browser localStorage (and SQLite3 on desktop) provides privacy-first storage for user health metrics, diet goals, pantry items, and saved meal plans across sessions without requiring external server database dependency.")
    ]
    
    for title, desc in layers:
        elements.append(Paragraph(f"<b>{title}</b> — {desc}", body_style))
        elements.append(Spacer(1, 2))
        
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Request Flow", h2_style))
    
    flow_text = """
    User Input (Next.js / PyQt6)<br/>
    &nbsp;&nbsp;↳ <b>Feature Router</b> (Next.js API Routes / Python Engine)<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>[localStorage / SQLite context & diet constraint fetch]</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Groq-hosted LLM</b> (Llama 3.3 70B / Llama Vision)<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Response Formatting & Diet Rule Validation</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Client-Side Persist</b> (localStorage / SQLite)<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ <b>Glassmorphism UI Display</b>
    """
    
    flow_table_data = [[Paragraph(flow_text, code_style)]]
    flow_table = Table(flow_table_data, colWidths=[504])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    
    elements.append(flow_table)
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph(
        "This architecture ensures high performance and modularity: features operate as isolated API endpoints, enabling easy extension of new AI capabilities without breaking database schemas or frontend views.",
        body_style
    ))

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully at {filename}")

if __name__ == "__main__":
    out_path = os.path.join(r"c:\Users\Hetshi chamariya\OneDrive\Documents\Desktop\NutriCoach", "NutriCoach_Technical_Specification.pdf")
    build_pdf(out_path)
