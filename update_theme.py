import re

with open("nutri-web/src/app/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Backgrounds
content = content.replace("bg-[#0a0a0a]", "bg-transparent")

# Text colors
content = content.replace("text-white", "text-stone-800")
content = content.replace("text-gray-400", "text-stone-500")
content = content.replace("text-gray-300", "text-stone-600")
content = content.replace("text-gray-500", "text-stone-400")
content = content.replace("text-gray-100", "text-stone-700")

# Primary hover and bg black
content = content.replace("text-black", "text-white")
content = content.replace("bg-black", "bg-stone-900")

# Borders
content = content.replace("border-white/10", "border-stone-200")
content = content.replace("border-white/20", "border-stone-300")
content = content.replace("border-white/5", "border-stone-200")

# Backgrounds with transparency
content = content.replace("bg-white/5", "bg-stone-800/5")
content = content.replace("bg-white/10", "bg-stone-800/10")

with open("nutri-web/src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
