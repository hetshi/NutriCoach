from services.groq_client import ask_groq, ask_groq_vision


# -------------------------------
# HARD DIET RESTRICTIONS
# -------------------------------

NON_VEG_ITEMS = {
    "egg", "eggs", "chicken", "fish", "mutton",
    "beef", "pork", "seafood", "prawn"
}

JAIN_RESTRICTED = {
    "onion", "garlic", "potato", "carrot",
    "beetroot", "radish", "ginger"
}


def generate_meal_plan(user, meal_type, servings=1):
    """
    STRICT INDIAN MEAL PLANNER
    - Diet enforced at CODE LEVEL
    - Jain / Veg / Non-veg safe
    - Goal based meals
    - Ingredient-only cooking
    """

    # -------------------------------
    # USER DATA
    # -------------------------------
    raw_ingredients = user.get("ingredients", [])
    diet = user.get("diet", "veg").lower()
    goal = user.get("goal", "Maintain Weight")
    allergies_raw = user.get("allergies", "")

    # -------------------------------
    # CLEAN ALLERGIES
    # -------------------------------
    allergies = [a.strip().lower() for a in allergies_raw.split(",") if a.strip()]
    allergies_text = ", ".join(allergies) if allergies else "None"

    # -------------------------------
    # FILTER INGREDIENTS (CRITICAL)
    # -------------------------------
    safe_ingredients = []

    for item in raw_ingredients:
        item_lower = item.lower().strip()

        # Remove allergens
        if item_lower in allergies:
            continue

        # Remove non-veg for veg & jain
        if diet in ["veg", "jain"] and item_lower in NON_VEG_ITEMS:
            continue

        # Remove jain restricted items
        if diet == "jain" and item_lower in JAIN_RESTRICTED:
            continue

        safe_ingredients.append(item)

    ingredients_text = (
        ", ".join(safe_ingredients)
        if safe_ingredients
        else "No safe ingredients available"
    )

    # -------------------------------
    # MEAL TYPE INSTRUCTIONS
    # -------------------------------
    if meal_type == "weekly":
        meal_instruction = (
            "Create a 7-DAY INDIAN MEAL PLAN.\n"
            "Each day MUST include:\n"
            "- Breakfast (quick & low-mess)\n"
            "- Lunch (proper cooked Indian meal)\n"
            "- Dinner (filling but healthy Indian meal)\n"
            "Clearly label Day 1 to Day 7.\n"
        )
    elif meal_type == "daily":
        meal_instruction = (
            "Create a 1-DAY INDIAN MEAL PLAN with:\n"
            "- Breakfast\n"
            "- Lunch\n"
            "- Dinner\n"
        )
    else:
        meal_instruction = f"Create ONE cooked Indian {meal_type} recipe."

    # -------------------------------
    # GOAL ENFORCEMENT
    # -------------------------------
    goal_rules = f"""
GOAL RULES (MANDATORY):
- User goal: {goal}

• If goal is "Weight Loss":
  - Minimal oil (max 1/2 tbsp per meal)
  - Light dinner
  - Avoid heavy carb + protein combos

• If goal is "Weight Gain" or "Muscle Gain":
  - TARGET: 90-110g total protein per day.
  - MINIMUM 20g protein per individual meal.
  - DINNER: Must be protein-dense (Paneer/Soya/Dal/Sprouts) and NOT carb-heavy.
  - Standardize measurements: 1 cup cooked Dal, 100g Paneer, 50g Soya Chunks.

• If goal is "Maintain Weight" or "Healthy Lifestyle":
  - Balanced Indian meals (Carbs + protein + vegetables)
"""

    # -------------------------------
    # FINAL HARD PROMPT
    # -------------------------------
    if meal_type in ["Breakfast", "Lunch", "Dinner"]:
        task_instruction = f"Create ONLY ONE cooked Indian {meal_type} recipe using {diet.upper()} ingredients. DO NOT provide any other meals."
        format_instruction = "Give ONLY this dish name + Ingredients used + 5-8 line cooking method + YT_LINK: [URL]. Portions: use realistic household measures."
    elif meal_type == "daily":
        task_instruction = (
            "Create a 1-DAY INDIAN MEAL PLAN with Breakfast, Lunch, and Dinner.\n"
            "Ensure meals are balanced and follow the SAFE INGREDIENTS list strictly."
        )
        format_instruction = "Provide 3 meals: Breakfast, Lunch, and Dinner. Include Ingredients, Method, and YT_LINK for each."
    else:
        task_instruction = (
            "Create a FULL 7-DAY INDIAN MEAL PLAN (Day 1 to Day 7).\n"
            "Each day MUST have Breakfast, Lunch, and Dinner.\n"
            "Ensure a total daily protein intake of 90-110g."
        )
        format_instruction = "Day-wise. Include YT_LINK: [URL] for EVERY dish (Total 21 links)."

    prompt = f"""
You are a WORLD-CLASS INDIAN NUTRITIONIST & CHEF specialized in {diet.upper()} fitness diets.

USER PROFILE:
- Diet type: {diet.upper()}
- Goal: {goal}
- Allergies (STRICT): {allergies_text}

MEDICAL ADVICE (STRICTLY FOLLOW THIS):
{user.get('health_advisor', 'No specific medical reports uploaded. Follow general healthy guidelines.')}

CRITICAL RULES (ORDER OF PRIORITY):
1. ABSOLUTE INGREDIENT COMPLIANCE: Use ONLY the safe ingredients provided. If "Paneer" is NOT in the list, you CANNOT suggest Paneer. If "Oats" is NOT in the list, you CANNOT suggest Oats. DO NOT invent ANY food item. 
2. NO HALLUCINATIONS: If you need a grain for a meal but "Rice" or "Wheat" isn't listed, DO NOT add it. Instead, create a meal using the vegetables/proteins available (e.g., a dry Sabzi or Salad).
3. PROTEIN vs LIST: While the goal is 20g protein per meal, the SAFE INGREDIENTS LIST is more important. If you only have "Potato" and "Tomato", you CANNOT suggest "Dal" to hit the protein target.
4. FORBIDDEN ITEMS: Eggs, Chicken, Meat, Paneer, Oats, Rice, Dal, etc., are all FORBIDDEN unless they are explicitly in the "SAFE INGREDIENTS" list below.
5. PANTRY LIMITS: Only Salt, Water, Cooking Oil, and basic dry spices (Turmeric, Chilli, Cumin) are available extras. 
6. PRACTICAL COOKING: Use Indian home techniques (Tawa, Pressure Cooker). No "muffin in pan" or unrealistic methods.
7. YOUTUBE: Provide `YT_LINK: https://www.youtube.com/results?search_query=[dish_name]+recipe` for every dish.
8. FAILURE STATE: If a balanced meal is impossible with the list, say: "Insufficient safe ingredients for a balanced [Meal Type]." DO NOT MAKE UP INGREDIENTS.

SAFE INGREDIENTS (ONLY USE THESE):
{ingredients_text}

{goal_rules}

CUISINE RULES:
- Authentic Indian flavors/dishes only.
- Format: Day-wise (1-7), Breakfast/Lunch/Dinner. Include Ingredients (with precise grams/cups) + 5-8 line Practical Method.

TASK:
{task_instruction}

FORMAT:
{format_instruction}
"""
    return ask_groq(prompt)


def find_nutritionists_in_city(city):
    """
    Find local nutritionists using Groq AI.
    Strictly filters for Nutritionists/Dietitians only.
    """
    prompt = f"""
    You are a specialized local health assistant for India.
    Task: Identify 4-5 REAL, highly-rated, and currently active NUTRITIONISTS or DIETITIANS strictly in "{city}".
    
    STRICT LOCALITY ENFORCEMENT:
    - If the user provides a specific neighborhood/suburb (e.g., Andheri, Bandra, Powai), you MUST only suggest experts located WITHIN that specific neighborhood. 
    - DO NOT suggest experts from other nearby areas if it violates the "strictly in {city}" rule.
    - Focus on professionals who have a physical clinic or verifiable practice in "{city}".

    STRICT FILTERING RULES:
    1. ONLY suggest dedicated Nutritionists or Dietitians.
    2. DO NOT suggest general doctors or multi-specialty hospitals unless they have a very prominent nutrition department.
    3. EXCLUDE gyms or general fitness centers.
    
    For each, provide:
    1. Full Name (Dr. name or Clinic name)
    2. Specialist Type (e.g., Clinical Dietitian, Sports Nutritionist)
    3. Precise Neighborhood/Street in {city}
    4. Notable Achievement (e.g., "Active on Instagram", "Expert in PCOD").
    
    Format each result exactly:
    - [NAME] | [SPECIALITY] | [PRECISE AREA] | [NOTABLE]
    
    ONLY return the list. No introduction or closing text.
    """
    return ask_groq(prompt)


def extract_ingredients_from_bill(content, is_image=False):
    """
    Extract edible food ingredients from raw grocery bill text or image using Groq AI.
    """
    prompt = """
    You are a data extraction specialist.
    Task: Extract ONLY the names of food ingredients/items from the provided grocery bill.
    
    RULES:
    1. Only extract edible food items (e.g., "Paneer", "Milk", "Tomatoes").
    2. Ignore prices, weights, tax, quantities, and non-food items (e.g., "Soap", "Broom").
    3. Clean the names to be simple (e.g., "Amul Gold Milk 1L" -> "Milk").
    4. Return as a comma-separated list.
    
    Return ONLY the comma-separated list. No intro or outro.
    """
    
    if is_image:
        return ask_groq_vision(prompt, content)
    else:
        full_prompt = f"{prompt}\n\nBILL TEXT:\n{content}"
        return ask_groq(full_prompt)
