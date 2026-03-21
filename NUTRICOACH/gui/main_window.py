import tkinter as tk
import threading
from tkinter import messagebox
import datetime
import customtkinter as ctk
import requests
from services.planner_service import generate_meal_plan, find_nutritionists_in_city, extract_ingredients_from_bill
from services.groq_client import ask_groq
from services.analysis_service import analyze_report_text
try:
    from services.pdf_service import generate_recipe_pdf
except ImportError:
    generate_recipe_pdf = None

try:
    from services.voice_service import listen, speak, parse_voice_command
except ImportError:
    listen = speak = parse_voice_command = None
from database.models import init_db, save_user, get_user, save_meal_history, get_meal_history, update_user_ingredients, update_health_advisor

# Initialize Database
init_db()

# Set modern appearance
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("green")

class NutriCoachApp:
    def __init__(self, root):
        self.root = root
        self.root.title("NutriCoach - AI Indian Nutritionist")
        self.root.geometry("1100x700")

        # Configure grid for sidebar layout
        self.root.grid_columnconfigure(1, weight=1)
        self.root.grid_rowconfigure(0, weight=1)

        self.current_user = None
        self.main_frame = None
        self.sidebar_frame = None
        self.map_widget = None
        self.status_label = None
        self.results_list = None
        self.map_container = None
        self.voice_btn = None

        self.show_auth_screen()

    def clear_screen(self):
        for widget in self.root.winfo_children():
            widget.destroy()

    # ---------- AUTHENTICATION SCREEN ----------
    def show_auth_screen(self):
        self.clear_screen()
        
        # Center frame
        bg_frame = ctk.CTkFrame(self.root, corner_radius=20)
        bg_frame.place(relx=0.5, rely=0.5, anchor="center", relwidth=0.4, relheight=0.7)

        ctk.CTkLabel(bg_frame, text="🥗 NutriCoach", font=("Segoe UI", 32, "bold"), text_color="#22C55E").pack(pady=(40, 10))
        ctk.CTkLabel(bg_frame, text="Your Personal AI Nutritionist", font=("Segoe UI", 16)).pack(pady=(0, 30))

        ctk.CTkButton(bg_frame, text="Login", height=45, font=("Segoe UI", 16, "bold"), command=self.login_ui).pack(pady=10, padx=40, fill="x")
        ctk.CTkButton(bg_frame, text="Create Account", height=45, fg_color="transparent", border_width=2, font=("Segoe UI", 16, "bold"), command=self.signup_ui).pack(pady=10, padx=40, fill="x")

    def login_ui(self):
        win = ctk.CTkToplevel(self.root)
        win.title("Login")
        win.geometry("400x450")
        win.attributes('-topmost', True)

        ctk.CTkLabel(win, text="Welcome Back", font=("Segoe UI", 24, "bold")).pack(pady=30)

        username_entry = ctk.CTkEntry(win, placeholder_text="Username", width=280, height=40)
        username_entry.pack(pady=10)

        password_entry = ctk.CTkEntry(win, placeholder_text="Password", show="*", width=280, height=40)
        password_entry.pack(pady=10)

        def handle_login():
            user = get_user(username_entry.get(), password_entry.get())
            if user:
                self.current_user = user
                win.destroy()
                self.show_dashboard()
            else:
                messagebox.showerror("Error", "Invalid username or password")

        ctk.CTkButton(win, text="Login", command=handle_login, width=280, height=40).pack(pady=30)

    def signup_ui(self):
        win = ctk.CTkToplevel(self.root)
        win.title("Signup")
        win.geometry("500x750")
        win.attributes('-topmost', True)

        scroll = ctk.CTkScrollableFrame(win, width=450, height=700)
        scroll.pack(fill="both", expand=True)

        ctk.CTkLabel(scroll, text="Join NutriCoach", font=("Segoe UI", 24, "bold")).pack(pady=20)

        fields = {}
        labels = [
            ("Full Name", "name"),
            ("Username", "username"),
            ("Password", "password"),
            ("Age", "age"),
            ("Height (cm)", "height"),
            ("Weight (kg)", "weight"),
            ("Allergies (comma separated)", "allergies")
        ]

        for label, key in labels:
            ctk.CTkLabel(scroll, text=label, font=("Segoe UI", 12)).pack(anchor="w", padx=60)
            entry = ctk.CTkEntry(scroll, width=330, height=35)
            if key == "password": entry.configure(show="*")
            entry.pack(pady=(0, 10))
            fields[key] = entry

        ctk.CTkLabel(scroll, text="Diet Type", font=("Segoe UI", 12)).pack(anchor="w", padx=60)
        diet_var = ctk.StringVar(value="veg")
        ctk.CTkOptionMenu(scroll, variable=diet_var, values=["veg", "jain", "non-veg", "vegan", "diabetic"], width=330).pack(pady=(0, 10))

        ctk.CTkLabel(scroll, text="Goal", font=("Segoe UI", 12)).pack(anchor="w", padx=60)
        goal_var = ctk.StringVar(value="Healthy Lifestyle")
        ctk.CTkOptionMenu(scroll, variable=goal_var, values=["Weight Loss", "Muscle Gain", "Maintain Weight", "Healthy Lifestyle"], width=330).pack(pady=(0, 10))

        def handle_signup():
            # Validate and save
            data = {k: v.get() for k, v in fields.items()}
            data["diet_type"] = diet_var.get()
            data["goal"] = goal_var.get()
            
            try:
                save_user(data)
                messagebox.showinfo("Success", "Account created successfully!")
                win.destroy()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to create account: {e}")

        ctk.CTkButton(scroll, text="Register", command=handle_signup, width=330, height=40).pack(pady=30)

    # ---------- DASHBOARD ----------
    def show_dashboard(self):
        self.clear_screen()

        # Sidebar
        self.sidebar_frame = ctk.CTkFrame(self.root, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)

        ctk.CTkLabel(self.sidebar_frame, text="NutriCoach", font=("Segoe UI", 24, "bold"), text_color="#22C55E").grid(row=0, column=0, padx=20, pady=20)

        ctk.CTkButton(self.sidebar_frame, text="Dashboard", command=self.show_home_content).grid(row=1, column=0, padx=20, pady=10)
        ctk.CTkButton(self.sidebar_frame, text="History", command=self.show_history_content).grid(row=2, column=0, padx=20, pady=10)
        ctk.CTkButton(self.sidebar_frame, text="Account", command=self.show_account_content).grid(row=3, column=0, padx=20, pady=10)
        ctk.CTkButton(self.sidebar_frame, text="Find Nutritionist", command=self.show_map_content).grid(row=4, column=0, padx=20, pady=10)
        
        # Voice Assistant Button
        self.voice_btn = ctk.CTkButton(self.sidebar_frame, text="Hey NutriCoach 🎙️", 
                                      fg_color="#8B5CF6", hover_color="#7C3AED",
                                      command=self.start_voice_assistant)
        self.voice_btn.grid(row=5, column=0, padx=20, pady=(10, 20))
        
        ctk.CTkButton(self.sidebar_frame, text="Logout", fg_color="transparent", border_width=1, command=self.show_auth_screen).grid(row=6, column=0, padx=20, pady=20)

        # Main Content
        self.main_frame = ctk.CTkFrame(self.root, corner_radius=0, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        
        self.show_home_content()

    def show_home_content(self):
        for widget in self.main_frame.winfo_children():
            widget.destroy()

        ctk.CTkLabel(self.main_frame, text=f"Namaste, {self.current_user['name']}!", font=("Segoe UI", 28, "bold")).pack(anchor="w", pady=(0, 20))

        grid = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        grid.pack(fill="both", expand=True)

        # Quick Actions
        cards = [
            ("Daily Meal Plan", "Get a 3-meal plan for today", lambda: self.generate_ui("daily")),
            ("Weekly Plan", "7-day comprehensive Indian diet", lambda: self.generate_ui("weekly")),
            ("Specific Recipe", "Breakfast, Lunch, or Dinner", lambda: self.generate_ui("specific"))
        ]

        for title, desc, command in cards:
            card = ctk.CTkFrame(grid, height=150, corner_radius=15)
            card.pack(fill="x", pady=10)
            ctk.CTkLabel(card, text=title, font=("Segoe UI", 18, "bold")).pack(anchor="w", padx=20, pady=(15, 0))
            ctk.CTkLabel(card, text=desc, font=("Segoe UI", 14), text_color="gray").pack(anchor="w", padx=20)
            ctk.CTkButton(card, text="Generate", width=100, command=command).pack(anchor="e", padx=20, pady=(0, 15))

    def generate_ui(self, mode):
        win = ctk.CTkToplevel(self.root)
        win.title("Generate Plan")
        win.geometry("500x400")
        win.attributes('-topmost', True)

        ctk.CTkLabel(win, text="Ingredients", font=("Segoe UI", 20, "bold")).pack(pady=20)
        ctk.CTkLabel(win, text="What's in your pantry? (comma separated)", font=("Segoe UI", 12)).pack(pady=5)

        ing_entry = ctk.CTkEntry(win, width=400, height=40)
        ing_entry.pack(pady=10)

        # Pre-fill with existing ingredients
        if self.current_user.get("ingredients"):
            existing_ings = ", ".join(self.current_user["ingredients"])
            ing_entry.insert(0, existing_ings)

        def scan_bill():
            from tkinter import filedialog
            import base64
            
            file_path = filedialog.askopenfilename(filetypes=[
                ("All Supported", "*.txt *.png *.jpg *.jpeg"),
                ("Text Files", "*.txt"),
                ("Image Files", "*.png *.jpg *.jpeg")
            ])
            
            if file_path:
                try:
                    is_image = file_path.lower().endswith(('.png', '.jpg', '.jpeg'))
                    
                    if is_image:
                        with open(file_path, "rb") as image_file:
                            content = base64.b64encode(image_file.read()).decode('utf-8')
                    else:
                        with open(file_path, "r", encoding="utf-8") as file:
                            content = file.read()
                    
                    messagebox.showinfo("Scanning", "AI is reading your bill...")
                    new_ingredients = extract_ingredients_from_bill(content, is_image=is_image)
                    
                    current_val = ing_entry.get().strip()
                    if current_val:
                        updated_val = f"{current_val}, {new_ingredients}"
                    else:
                        updated_val = new_ingredients
                    
                    ing_entry.delete(0, "end")
                    ing_entry.insert(0, updated_val)
                    messagebox.showinfo("Success", "Ingredients added from bill!")
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to scan bill: {e}")

        ctk.CTkButton(win, text="Scan Grocery Bill 🧾", command=scan_bill, height=35, fg_color="#333333").pack(pady=5)

        meal_var = None
        if mode == "specific":
            meal_var = ctk.StringVar(value="Lunch")
            ctk.CTkOptionMenu(win, variable=meal_var, values=["Breakfast", "Lunch", "Dinner"], width=400).pack(pady=10)

        def proceed():
            ingredients = [i.strip() for i in ing_entry.get().split(",") if i.strip()]
            update_user_ingredients(self.current_user["id"], ingredients)
            self.current_user["ingredients"] = ingredients

            # Show loading
            win.destroy()
            self.loading_screen(mode, meal_var.get() if meal_var else mode)

        ctk.CTkButton(win, text="Start AI Chef", command=proceed, height=40, width=400).pack(pady=30)

    def loading_screen(self, mode, meal_type):
        loader = ctk.CTkToplevel(self.root)
        loader.geometry("400x300")
        loader.title("AI Chef is cooking...")
        loader.attributes('-topmost', True)

        ctk.CTkLabel(loader, text="🧪 Creating your meal plan...", font=("Segoe UI", 18, "bold")).pack(pady=40)
        bar = ctk.CTkProgressBar(loader, width=300)
        bar.pack(pady=20)
        bar.start()

        def run():
            try:
                recipe = generate_meal_plan(self.current_user, meal_type)
                save_meal_history(self.current_user["id"], meal_type, recipe)
                
                # Clear ingredients after successful generation as requested
                update_user_ingredients(self.current_user["id"], [])
                self.current_user["ingredients"] = []
                
                loader.destroy()
                self.show_result(recipe)
            except Exception as e:
                loader.destroy()
                messagebox.showerror("AI Error", f"Failed to generate meal: {e}")

        self.root.after(100, run)

    def show_result(self, recipe):
        import webbrowser
        import re

        win = ctk.CTkToplevel(self.root)
        win.title("Your Indian Meal Plan")
        win.geometry("800x850") # Slightly wider for better text display
        win.attributes('-topmost', True)
        
        # Robust parsing for YT links (handles YT_LINK:, YouTube Search Link:, etc.)
        # Looks for any URL starting with youtube.com/results?search_query=
        yt_pattern = r"(?:YT_LINK:|YouTube Search Link:|Search Link:)?\s*(https?://www\.youtube\.com/results\?search_query=\S+)"
        yt_links = re.findall(yt_pattern, recipe, re.IGNORECASE)
        
        # Clean the recipe text of the raw link markers for a cleaner display
        clean_recipe = re.sub(yt_pattern, "", recipe, flags=re.IGNORECASE)
        # Remove empty bracket pairs or backticks that might be left over
        clean_recipe = re.sub(r"\[\s*\]|`\s*`|\*\*\s*\*\*", "", clean_recipe)

        text_area = ctk.CTkTextbox(win, font=("Segoe UI", 15), corner_radius=15, border_width=2)
        text_area.pack(fill="both", expand=True, padx=20, pady=20)
        text_area.insert("1.0", clean_recipe.strip())
        text_area.configure(state="disabled")

        if yt_links:
            # Create a dedicated "Action" area for links
            action_frame = ctk.CTkFrame(win, fg_color="transparent")
            action_frame.pack(fill="x", padx=20, pady=(0, 25))
            
            ctk.CTkLabel(action_frame, text="Watch Video Tutorials:", font=("Segoe UI", 14, "bold")).pack(anchor="w", padx=5, pady=(0, 5))
            
            for i, link in enumerate(yt_links):
                # Clean the link (remove trailing backticks, brackets, etc. often added by AI)
                clean_link = link.strip("`[]()*\"' ")
                
                label = f"Recipe {i+1} Tutorial 🎥" if len(yt_links) > 1 else "Watch Recipe Tutorial 🎥"
                ctk.CTkButton(
                    action_frame, 
                    text=label, 
                    command=lambda l=clean_link: webbrowser.open(l),
                    fg_color="#FF0000", # YouTube Red
                    hover_color="#CC0000",
                    height=45,
                    font=("Segoe UI", 14, "bold"),
                    corner_radius=10
                ).pack(side="left", padx=5)
        else:
            # Fallback in case AI missed it - generate a search link based on the first line (title)
            title = recipe.split('\n')[0].strip('#* ')
            if title and len(title) < 50:
                fallback_link = f"https://www.youtube.com/results?search_query={title.replace(' ', '+')}+recipe"
                btn = ctk.CTkButton(
                    win, 
                    text="Search Recipe on YouTube 🎥", 
                    command=lambda: webbrowser.open(fallback_link),
                    fg_color="#333333",
                    height=40
                )
                btn.pack(pady=(0, 20))

        # PDF Download Button
        def download_pdf():
            if generate_recipe_pdf is None:
                messagebox.showerror("Error", "PDF libraries (fpdf2) are not installed. This feature is unavailable.")
                return
            from tkinter import filedialog
            file_path = filedialog.asksaveasfilename(
                defaultextension=".pdf",
                filetypes=[("PDF files", "*.pdf")],
                initialfile=f"NutriCoach_MealPlan_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
            )
            if file_path:
                try:
                    import datetime as dt # Ensure datetime is available for filename
                    generate_recipe_pdf(recipe, file_path)
                    messagebox.showinfo("Success", f"Meal plan saved successfully to:\n{file_path}")
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to save PDF: {e}")

        ctk.CTkButton(
            win, 
            text="Download Recipe PDF 📩", 
            command=download_pdf,
            fg_color="#22C55E",
            hover_color="#16A34A",
            height=40,
            font=("Segoe UI", 14, "bold"),
            corner_radius=10
        ).pack(pady=(0, 20))

    def show_account_content(self):
        from tkinter import filedialog

        for widget in self.main_frame.winfo_children():
            widget.destroy()

        ctk.CTkLabel(self.main_frame, text="Account & Medical Profile", font=("Segoe UI", 28, "bold")).pack(anchor="w", pady=(0, 20))

        # Profile Card
        profile_card = ctk.CTkFrame(self.main_frame, corner_radius=15, fg_color="#2A2A2A")
        profile_card.pack(fill="x", pady=10)
        
        info = f"👤 {self.current_user['name']} | {self.current_user['age']} years | {self.current_user['diet'].upper()}"
        ctk.CTkLabel(profile_card, text=info, font=("Segoe UI", 16, "bold")).pack(anchor="w", padx=20, pady=10)
        
        detail = f"Goal: {self.current_user['goal']} | Height: {self.current_user['height']}cm | Weight: {self.current_user['weight']}kg"
        ctk.CTkLabel(profile_card, text=detail, font=("Segoe UI", 14), text_color="gray").pack(anchor="w", padx=20, pady=(0, 10))

        # Medical Section
        med_frame = ctk.CTkFrame(self.main_frame, corner_radius=15)
        med_frame.pack(fill="both", expand=True, pady=10)
        
        ctk.CTkLabel(med_frame, text="Medical Report Analysis", font=("Segoe UI", 20, "bold")).pack(anchor="w", padx=20, pady=(15, 5))
        ctk.CTkLabel(med_frame, text="Upload your health report for personalized AI recommendations.", font=("Segoe UI", 12), text_color="gray").pack(anchor="w", padx=20)

        advice_text = ctk.CTkTextbox(med_frame, font=("Segoe UI", 13), border_width=1)
        advice_text.pack(fill="both", expand=True, padx=20, pady=15)
        
        current_advice = self.current_user.get("health_advisor") or "No report uploaded yet."
        advice_text.insert("1.0", str(current_advice))
        advice_text.configure(state="disabled")

        def upload_report():
            file_path = filedialog.askopenfilename(filetypes=[("Text Files", "*.txt")])
            if file_path:
                try:
                    with open(file_path, "r", encoding="utf-8") as file:
                        content = file.read()
                    
                    if len(content) < 20: 
                        messagebox.showwarning("Empty Report", "Report content is too short for analysis.")
                        return

                    # Analysis logic
                    messagebox.showinfo("Analysis Started", "AI is analyzing your report word-to-word. This may take a moment.")
                    result = analyze_report_text(content)
                    
                    # Save to DB
                    update_health_advisor(self.current_user["id"], result)
                    save_meal_history(self.current_user["id"], "MEDICAL ANALYSIS", result)
                    self.current_user["health_advisor"] = result
                    
                    # UI Refresh
                    advice_text.configure(state="normal")
                    advice_text.delete("1.0", "end")
                    advice_text.insert("1.0", result)
                    advice_text.configure(state="disabled")
                    messagebox.showinfo("Success", "Medical analysis updated and saved to History! Your meal plans will now reflect these recommendations.")
                
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to process report: {e}")

        ctk.CTkButton(med_frame, text="Upload Report (.txt) 📄", command=upload_report, width=200, height=40).pack(pady=(0, 20))

    def show_map_content(self):
        import webbrowser
        for widget in self.main_frame.winfo_children():
            widget.destroy()

        # Layout: Main Title
        ctk.CTkLabel(self.main_frame, text="Find Nutritionist Near You", font=("Segoe UI", 28, "bold")).pack(anchor="w", pady=(0, 5))
        self.status_label = ctk.CTkLabel(self.main_frame, text="Search for expert consultants in your city.", font=("Segoe UI", 14), text_color="gray")
        self.status_label.pack(anchor="w", pady=(0, 20))

        # Search Bar
        search_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        search_frame.pack(fill="x", pady=(0, 20))

        search_entry = ctk.CTkEntry(search_frame, placeholder_text="Enter city (e.g., Mumbai, Delhi, Bangalore)...", height=45, font=("Segoe UI", 16))
        search_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))

        # Results Area
        self.results_scroll = ctk.CTkScrollableFrame(self.main_frame, fg_color="transparent")
        self.results_scroll.pack(fill="both", expand=True)

        def perform_lookup():
            city = search_entry.get().strip()
            if not city:
                messagebox.showwarning("Input Required", "Please enter a city name.")
                return

            self.status_label.configure(text=f"🔍 Finding top experts in {city}...")
            # Clear old results
            for widget in self.results_scroll.winfo_children():
                widget.destroy()

            def run():
                try:
                    raw_results = find_nutritionists_in_city(city)
                    self.status_label.configure(text=f"✅ Recommendations for {city}:")
                    
                    lines = [line.strip("- ") for line in raw_results.split("\n") if "|" in line]
                    
                    if not lines:
                        ctk.CTkLabel(self.results_scroll, text="No specific listings found. Please try a major city.", font=("Segoe UI", 16)).pack(pady=40)
                        return

                    for line in lines:
                        parts = [p.strip() for p in line.split("|")]
                        if len(parts) >= 3:
                            name = parts[0]
                            spec = parts[1]
                            area = parts[2]
                            desc = parts[3] if len(parts) > 3 else "Top-rated consultant."

                            # Card
                            card = ctk.CTkFrame(self.results_scroll, corner_radius=15)
                            card.pack(fill="x", pady=10, padx=5)
                            
                            ctk.CTkLabel(card, text=name, font=("Segoe UI", 18, "bold"), text_color="#22C55E").pack(anchor="w", padx=20, pady=(15, 0))
                            ctk.CTkLabel(card, text=spec, font=("Segoe UI", 14, "italic"), text_color="gray").pack(anchor="w", padx=20)
                            ctk.CTkLabel(card, text=f"📍 {area}", font=("Segoe UI", 13)).pack(anchor="w", padx=20, pady=5)
                            ctk.CTkLabel(card, text=desc, font=("Segoe UI", 13), wraplength=700).pack(anchor="w", padx=20, pady=(0, 15))

                            # Button Frame
                            btn_frame = ctk.CTkFrame(card, fg_color="transparent")
                            btn_frame.pack(fill="x", padx=20, pady=(0, 15))

                            # Maps Button
                            gmaps_url = f"https://www.google.com/maps/search/{name.replace(' ', '+')}+{area.replace(' ', '+')}+{city.replace(' ', '+')}"
                            ctk.CTkButton(btn_frame, text="Open Clinic Location 📍", width=180, height=32, 
                                         command=lambda url=gmaps_url: webbrowser.open(url)).pack(side="left", padx=(0, 10))
                            
                            # Instagram Search Button
                            insta_url = f"https://www.instagram.com/explore/tags/{name.replace(' ', '').replace('.', '')}/"
                            # Fallback to general search if tag is too narrow
                            insta_search_url = f"https://www.google.com/search?q={name.replace(' ', '+')}+nutritionist+instagram"
                            
                            ctk.CTkButton(btn_frame, text="Find on Instagram 📸", width=180, height=32, 
                                         fg_color="#E1306C", hover_color="#C13584",
                                         command=lambda url=insta_search_url: webbrowser.open(url)).pack(side="left")
                except Exception as e:
                    self.status_label.configure(text="Error fetching data.")
                    messagebox.showerror("Search Error", f"Could not fetch data: {e}")

            self.root.after(100, run)

        ctk.CTkButton(search_frame, text="Find Experts 🔍", width=150, height=45, font=("Segoe UI", 14, "bold"), command=perform_lookup).pack(side="right")

    def show_history_content(self):
        for widget in self.main_frame.winfo_children():
            widget.destroy()

        ctk.CTkLabel(self.main_frame, text="Meal History", font=("Segoe UI", 28, "bold")).pack(anchor="w", pady=(0, 20))

        history = get_meal_history(self.current_user["id"])
        
        if not history:
            ctk.CTkLabel(self.main_frame, text="No meals saved yet. Start cooking!", font=("Segoe UI", 16)).pack(pady=50)
            return

        scroll = ctk.CTkScrollableFrame(self.main_frame)
        scroll.pack(fill="both", expand=True)

        for m_type, recipe, servings, timestamp in history:
            item = ctk.CTkFrame(scroll)
            item.pack(fill="x", pady=5, padx=5)
            
            # Special styling for medical reports in history
            display_type = m_type.upper()
            fg_color = "#22C55E" if m_type == "MEDICAL ANALYSIS" else None
            text_color = "white" if m_type == "MEDICAL ANALYSIS" else None
            label_prefix = "📋 " if m_type == "MEDICAL ANALYSIS" else "🥣 "
            
            ctk.CTkLabel(item, text=f"{label_prefix}{display_type} - {timestamp}", 
                         font=("Segoe UI", 14, "bold"), text_color=text_color).pack(anchor="w", padx=15, pady=5)
            
            def view_full(r=recipe):
                self.show_result(r)
                
            ctk.CTkButton(item, text="View Details", width=80, height=24, command=view_full).pack(anchor="e", padx=15, pady=5)

    def start_voice_assistant(self):
        if listen is None:
            messagebox.showerror("Error", "Voice libraries are not installed. This feature is unavailable.")
            return
        self.voice_btn.configure(text="Listening... 👂", state="disabled")
        self.root.update()
        
        def run():
            try:
                speech = listen()
                if speech == "ERROR_MISSING_PYAUDIO":
                    speak("I'm sorry, my ears aren't working because PyAudio is missing on this system.")
                    messagebox.showerror("Voice Error", "PyAudio is not installed. Voice features require PyAudio.")
                    self.voice_btn.configure(text="Hey NutriCoach 🎙️", state="normal")
                    return
                elif speech == "ERROR_MISSING_DEPS":
                    speak("I'm missing some voice processing libraries.")
                    messagebox.showerror("Voice Error", "Speech libraries are missing. Please run pip install.")
                    self.voice_btn.configure(text="Hey NutriCoach 🎙️", state="normal")
                    return
                elif not speech:
                    speak("Sorry, I didn't catch that. Could you repeat?")
                    self.voice_btn.configure(text="Hey NutriCoach 🎙️", state="normal")
                    return

                command = parse_voice_command(speech)
                if not command:
                    speak("I understood the words, but I'm not sure what you want me to do.")
                    self.voice_btn.configure(text="Hey NutriCoach 🎙️", state="normal")
                    return

                # Handle Commands
                if command["type"] == "generate_meal":
                    mode = command.get("mode", "daily")
                    ingredients = command.get("ingredients", "")
                    if ingredients:
                        self.current_user["ingredients"] = [i.strip() for i in ingredients.split(",")]
                    
                    speak(f"Sure, I'm cooking up a {mode} meal plan for you.")
                    self.root.after(0, lambda: self.loading_screen(mode, mode))
                
                elif command["type"] == "find_nutritionist":
                    city = command.get("city")
                    if city:
                        speak(f"Searching for the best nutritionists in {city}.")
                        self.root.after(0, self.show_map_content)
                        # We would ideally trigger the search too, but let's navigate first
                    else:
                        speak("Which city should I look in?")
                
                elif command["type"] == "general_query":
                    speak("Thinking...")
                    ans = ask_groq(f"Answer this query concisely for a health app user: {command['query']}")
                    speak(ans)
                    messagebox.showinfo("NutriCoach Assistant", ans)

                self.voice_btn.configure(text="Hey NutriCoach 🎙️", state="normal")
            except Exception as e:
                print(f"Voice UI error: {e}")
                self.voice_btn.configure(text="Hey NutriCoach 🎙️", state="normal")

        threading.Thread(target=run).start()

if __name__ == "__main__":
    root = ctk.CTk()
    app = NutriCoachApp(root)
    root.mainloop()

