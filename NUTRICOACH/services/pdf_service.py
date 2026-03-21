# services/pdf_service.py
from fpdf import FPDF
import datetime

class RecipePDF(FPDF):
    def header(self):
        # Logo or Branding
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(34, 197, 94)  # NutriCoach Green (#22C55E)
        self.cell(0, 10, "NutriCoach - AI Indian Nutritionist", border=0, ln=1, align="C")
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, f"Generated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", border=0, ln=1, align="C")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(169, 169, 169)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}} - Your Health, Our Priority", align="C")

def generate_recipe_pdf(recipe_text, save_path):
    """
    Converts meal plan/recipe text into a formatted PDF.
    """
    pdf = RecipePDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Body
    pdf.set_font("Helvetica", size=12)
    pdf.set_text_color(0, 0, 0)
    
    # Process text for FPDF compatibility (handling basic markdown-like symbols AI uses)
    clean_text = recipe_text.replace("**", "").replace("*", "-").replace("#", "")
    
    # Multi-cell for wrapping text
    pdf.multi_cell(0, 8, txt=clean_text)
    
    pdf.output(save_path)
    return True
