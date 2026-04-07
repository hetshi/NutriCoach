"use client";

import { useState, useRef, useEffect } from "react";
import {
  Mic,
  Send,
  Leaf,
  Image as ImageIcon,
  FileText,
  Download,
  User,
  Bot,
  Loader2,
  Trash2,
  LayoutDashboard,
  History,
  MapPin,
  Settings,
  LogOut,
  Calendar,
  Utensils,
  PlusCircle,
  Clock,
  Youtube,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  name: string;
  username: string;
  password: string;
  age: string;
  height: string;
  weight: string;
  diet_type: string;
  goal: string;
  health_advisor?: string;
  meal_history?: Array<{
    type: string;
    content: string;
    timestamp: string;
  }>;
}

export default function NutriCoachWeb() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "nutritionists" | "account" | "bmi">("dashboard");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeType, setActiveType] = useState<"bill" | "report">("bill");
  const [searchCity, setSearchCity] = useState("");
  const [nutritionists, setNutritionists] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfiguringPlan, setIsConfiguringPlan] = useState(false);
  const [planType, setPlanType] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isScanningInModal, setIsScanningInModal] = useState(false);
  const [mealTime, setMealTime] = useState<"Breakfast" | "Lunch" | "Dinner">("Lunch");

  // BMI Calculator state
  const [bmiHeight, setBmiHeight] = useState("");
  const [bmiWeight, setBmiWeight] = useState("");
  const [bmiResult, setBmiResult] = useState<number | null>(null);
  const [bmiTip, setBmiTip] = useState("");
  const [isLoadingBmiTip, setIsLoadingBmiTip] = useState(false);

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-blue-400", bg: "bg-blue-400/20", border: "border-blue-400/30", icon: TrendingDown, tip: "underweight" };
    if (bmi < 25)   return { label: "Healthy",     color: "text-green-400", bg: "bg-green-400/20", border: "border-green-400/30", icon: Minus, tip: "at a healthy weight" };
    if (bmi < 30)   return { label: "Overweight",  color: "text-yellow-400", bg: "bg-yellow-400/20", border: "border-yellow-400/30", icon: TrendingUp, tip: "overweight" };
    return           { label: "Obese",         color: "text-red-400", bg: "bg-red-400/20", border: "border-red-400/30", icon: TrendingUp, tip: "obese" };
  };

  const calculateBmi = () => {
    const h = parseFloat(bmiHeight) / 100;
    const w = parseFloat(bmiWeight);
    if (!h || !w || h <= 0 || w <= 0) return;
    setBmiResult(parseFloat((w / (h * h)).toFixed(1)));
    setBmiTip("");
  };

  const getAiBmiTip = async () => {
    if (!bmiResult) return;
    const cat = getBmiCategory(bmiResult);
    setIsLoadingBmiTip(true);
    setBmiTip("");
    try {
      const prompt = `The user has a BMI of ${bmiResult} (${cat.label}). They follow a ${user?.diet_type || "balanced"} diet and their goal is ${user?.goal || "healthy lifestyle"}. Give 3 short, practical, specific Indian diet tips (bullet points) to help them reach a healthy BMI. Be encouraging and concise.`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], user }),
      });
      const data = await res.json();
      setBmiTip(data.content || "Could not load tips.");
    } catch {
      setBmiTip("Could not load tips. Check your API key in Account settings.");
    } finally {
      setIsLoadingBmiTip(false);
    }
  };

  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("nutricoach_active_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setBmiHeight(parsed.height || "");
      setBmiWeight(parsed.weight || "");
    }
    const savedKey = localStorage.getItem("nutricoach_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Save active user session to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("nutricoach_active_user", JSON.stringify(user));
      // Also persist in the multi-user store keyed by username
      const allUsers = JSON.parse(localStorage.getItem("nutricoach_all_users") || "{}");
      allUsers[user.username.toLowerCase()] = user;
      localStorage.setItem("nutricoach_all_users", JSON.stringify(allUsers));
    }
    if (apiKey) localStorage.setItem("nutricoach_key", apiKey);
  }, [user, apiKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const allUsers = JSON.parse(localStorage.getItem("nutricoach_all_users") || "{}");
    const found = allUsers[loginUsername.trim().toLowerCase()];
    if (!found) {
      setLoginError(`No account found for "${loginUsername}". Please register first.`);
      return;
    }
    if (found.password !== btoa(loginPassword)) {
      setLoginError("Incorrect password. Please try again.");
      return;
    }
    setUser(found);
  };

  const handleLogout = () => {
    // Save current user data before clearing session
    if (user) {
      const allUsers = JSON.parse(localStorage.getItem("nutricoach_all_users") || "{}");
      allUsers[user.username.toLowerCase()] = user;
      localStorage.setItem("nutricoach_all_users", JSON.stringify(allUsers));
    }
    localStorage.removeItem("nutricoach_active_user");
    setUser(null);
    setMessages([]);
    setLoginUsername("");
    setLoginPassword("");
  };

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({ messages: newMessages, user }),
      });

      if (!response.ok) {
        throw new Error(`AI error: ${response.status}. Make sure your API Key is set in Settings/Account.`);
      }

      const data = await response.json();
      if (data.content) {
        const assistantMessage = { role: "assistant" as const, content: data.content };
        setMessages(prev => [...prev, assistantMessage]);

        // Save to history if it looks like a meal plan
        if (data.content.toLowerCase().includes("recipe") || data.content.toLowerCase().includes("meal plan")) {
          const type = text.toLowerCase().includes("weekly") ? "Weekly Plan" : "Daily Plan";
          const historyItem = {
            type,
            content: data.content,
            timestamp: new Date().toLocaleString()
          };
          setUser(prev => prev ? ({
            ...prev,
            meal_history: [historyItem, ...(prev.meal_history || [])]
          }) : null);
        }
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${error.message || "I'm having trouble connecting to the brain."}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMealPlanFromConfig = () => {
    if (!planType) return;
    const healthContext = user?.health_advisor ? `IMPORTANT: User has these medical insights: ${user.health_advisor}. ACT ACCORDINGLY by avoiding restricted foods or prioritizing needed nutrients.` : "";
    const dietReminder = user?.diet_type === "jain" ? "CRITICAL: The user is JAIN. You MUST NOT include Onion, Garlic, Potato, Ginger, Carrot, or any Root Vegetables. " : "";
    const breakfastReminder = "IMPORTANT: Suggest a substantial Indian breakfast (Poha, Chilla, Upma, etc.). NO 'only curd' or 'only fruit' meals. ";
    
    const prompt = `${dietReminder}${breakfastReminder}I am using my Ingredient Book. ${healthContext} Plan type: ${planType}. ${planType === "specific" ? `Specifically for ${mealTime}. ` : ""}${ingredients ? `Ingredients available: ${ingredients}.` : "Suggest healthy recipes."} Please provide the plan with clickable YouTube recipe links using the format [Watch Recipe](URL).`;
    
    setIsConfiguringPlan(false);
    handleSend(prompt);
    setPlanType(null);
    setIngredients("");
  };

  const handleNutritionistSearch = async () => {
    if (!searchCity.trim()) return;
    setIsSearching(true);
    setNutritionists([]);
    try {
      const response = await fetch("/api/nutritionists", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({ city: searchCity }),
      });
      const data = await response.json();
      if (data.content) {
        const lines = data.content.split("\n").filter((l: string) => l.includes("|"));
        const parsed = lines
          .map((l: string) => {
            const [name, specialty, area, instagram] = l.split("|").map(s => s.trim().replace(/^[-*\d.]+\s*/, ""));
            return { name, specialty, area, instagram };
          })
          .filter((n: any) => {
            // Client-side safety filter: drop results whose address doesn't mention the searched city
            if (!n.name || !n.area) return false;
            return n.area.toLowerCase().includes(searchCity.toLowerCase());
          });
        setNutritionists(parsed);
      }
    } catch (error) {
      alert("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const startVoice = (onTranscript?: (text: string) => void) => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (onTranscript) {
        onTranscript(transcript);
      } else {
        handleSend(transcript);
      }
    };
    recognition.start();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isConfiguringPlan) setIsScanningInModal(true);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", activeType);
    try {
      const response = await fetch("/api/scan", { 
        method: "POST", 
        body: formData,
        headers: { "x-api-key": apiKey }
      });
      const data = await response.json();
      console.log("Scan Result Data:", data);

      if (!response.ok) {
        throw new Error(data.details || data.scan_text || data.error || "Server Error 500");
      }
      if (data.success && data.scan_text) {
        if (activeType === "bill") {
          if (isConfiguringPlan) {
            const result = data.scan_text.trim();
            setIngredients(prev => prev ? `${prev}, ${result}` : result);
          } else {
            const scanPrompt = `I have these ingredients: ${data.scan_text}. Suggest a healthy Indian meal.`;
            setInput(scanPrompt);
            setTimeout(() => handleSend(scanPrompt), 100);
          }
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: `Medical Analysis: ${data.scan_text}` }]);
          const reportItem = {
            type: "Medical Report",
            content: data.scan_text,
            timestamp: new Date().toLocaleString()
          };
          setUser(prev => prev ? ({ 
            ...prev, 
            health_advisor: data.scan_text,
            meal_history: [reportItem, ...(prev.meal_history || [])]
          }) : null);
        }
      } else {
        console.error("Scanner failed to extract valid text:", data);
        alert(`SCAN ERROR\nReason: ${data.debug_info || "No text detected"}\n\nAI Message: ${data.scan_text || "The AI could not read this image accurately. Try a closer, brighter photo."}`);
      }
    } catch (error: any) {
      console.error("Scan error details:", error);
      const errorMessage = error.stack || error.message || "Unknown scan error";
      alert(`SCAN FAILURE:\n${errorMessage.substring(0, 300)}`);
    } finally {
      setIsLoading(false);
      setIsScanningInModal(false);
    }
  };

  // --- Auth Screen Component ---
  const FormattedMessage = ({ content }: { content: string }) => {
    const parts = content.split(/(\[.*?\]\(https?:\/\/.*?\))/g);
    return (
      <div className="space-y-2">
        {parts.map((part, i) => {
          const match = part.match(/\[(.*?)\]\((https?:\/\/.*?)\)/);
          if (match) {
            return (
              <a 
                key={i} 
                href={match[2]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors my-1 border border-red-500/30 font-medium"
              >
                <Youtube size={14} />
                {match[1]}
              </a>
            );
          }
          return <span key={i} className="whitespace-pre-wrap">{part}</span>;
        })}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#D6CCC2]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl w-full max-w-md space-y-6"
        >
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="bg-primary/20 p-4 rounded-2xl w-fit mx-auto border border-primary/30">
              <Leaf className="text-primary w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Welcome to NutriCoach</h1>
            <p className="text-[#6B705C] font-medium">Your Personal AI Indian Nutritionist</p>
          </div>

          {/* Tab Toggle */}
          <div className="flex bg-[#4E342E]/5 rounded-2xl p-1 border border-[#4E342E]/10">
            <button
              onClick={() => { setAuthTab("login"); setLoginError(""); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                authTab === "login" ? "bg-primary text-[#F5EBE0]" : "text-[#6B705C] hover:text-[#4E342E]"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setAuthTab("register"); setLoginError(""); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                authTab === "register" ? "bg-primary text-[#F5EBE0]" : "text-[#6B705C] hover:text-[#4E342E]"
              }`}
            >
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* LOGIN FORM */}
            {authTab === "login" && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <input
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Username"
                  required
                  autoComplete="username"
                  className="auth-input"
                />
                <div className="relative">
                  <input
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    type={showLoginPass ? "text" : "password"}
                    placeholder="Password"
                    required
                    autoComplete="current-password"
                    className="auth-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary text-xs font-bold"
                  >
                    {showLoginPass ? "HIDE" : "SHOW"}
                  </button>
                </div>
                {loginError && (
                  <p className="text-red-400 text-sm font-medium bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    ⚠️ {loginError}
                  </p>
                )}
                <button className="w-full py-4 bg-primary text-[#F5EBE0] font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-[#6B705C]/20">
                  Login
                </button>
                <p className="text-center text-[#6B705C] text-sm font-medium">
                  New here?{" "}
                  <button type="button" onClick={() => { setAuthTab("register"); setLoginError(""); }} className="text-[#CB997E] underline hover:text-[#4E342E]">
                    Create an account
                  </button>
                </p>
              </motion.form>
            )}

            {/* REGISTER FORM */}
            {authTab === "register" && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const data = Object.fromEntries(formData.entries()) as any;
                  if (data.password !== data.confirm_password) {
                    alert("Passwords do not match. Please try again.");
                    return;
                  }
                  if (data.password.length < 6) {
                    alert("Password must be at least 6 characters.");
                    return;
                  }
                  const allUsers = JSON.parse(localStorage.getItem("nutricoach_all_users") || "{}");
                  if (allUsers[data.username.trim().toLowerCase()]) {
                    alert(`Username "${data.username}" is already taken. Please choose another or login.`);
                    setAuthTab("login");
                    setLoginUsername(data.username);
                    return;
                  }
                  const { confirm_password, ...rest } = data;
                  setUser({ ...rest, username: rest.username.trim().toLowerCase(), password: btoa(rest.password), meal_history: [] });
                }}
                className="space-y-4"
              >
                <input name="name" placeholder="Full Name" required className="auth-input" />
                <input name="username" placeholder="Choose a Username" required className="auth-input" autoComplete="username" />
                <div className="grid grid-cols-2 gap-4">
                  <input name="age" type="number" placeholder="Age" required className="auth-input" />
                  <input name="height" type="number" placeholder="Height (cm)" required className="auth-input" />
                </div>
                <input name="weight" type="number" placeholder="Weight (kg)" required className="auth-input" />
                <select name="diet_type" className="auth-input bg-transparent">
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="jain">Jain</option>
                  <option value="vegan">Vegan</option>
                  <option value="diabetic">Diabetic Friendly</option>
                </select>
                <select name="goal" className="auth-input bg-transparent">
                  <option value="Maintain Weight">Maintain Weight</option>
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="Healthy Lifestyle">Healthy Lifestyle</option>
                </select>
                <div className="relative">
                  <input
                    name="password"
                    type={showRegPass ? "text" : "password"}
                    placeholder="Create Password (min 6 chars)"
                    required
                    autoComplete="new-password"
                    className="auth-input pr-12"
                  />
                  <button type="button" onClick={() => setShowRegPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B705C] hover:text-primary text-xs font-bold">
                    {showRegPass ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    name="confirm_password"
                    type={showRegConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    required
                    autoComplete="new-password"
                    className="auth-input pr-12"
                  />
                  <button type="button" onClick={() => setShowRegConfirm(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B705C] hover:text-primary text-xs font-bold">
                    {showRegConfirm ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <button className="w-full py-4 bg-primary text-[#F5EBE0] font-bold rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-[#6B705C]/20">
                  Start Your Journey
                </button>
                <p className="text-center text-[#6B705C] text-sm font-medium">
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setAuthTab("login"); setLoginError(""); }} className="text-[#CB997E] underline hover:text-[#4E342E]">
                    Login
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <style jsx>{`
          .auth-input {
            width: 100%;
            background: rgba(78, 52, 46, 0.05);
            border: 1px solid rgba(78, 52, 46, 0.1);
            border-radius: 1rem;
            padding: 0.75rem 1rem;
            color: #4E342E;
            outline: none;
            transition: border-color 0.2s;
          }
          .auth-input:focus { border-color: var(--primary); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#D6CCC2] text-[#4E342E] font-['Outfit'] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 glass border-r border-[#4E342E]/10 flex flex-col p-4 md:p-6 transition-all">
        <div className="flex items-center gap-3 mb-10 px-2 flex-col items-start">
          <div className="flex items-center gap-3">
            <Leaf className="text-primary w-8 h-8 shrink-0" />
            <h1 className="text-xl font-bold gradient-text hidden md:block">NutriCoach</h1>
          </div>
          <div className="mt-2 space-y-1 hidden md:block">
            <span className="text-[12px] text-green-500 font-bold uppercase tracking-[0.2em] bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 animate-pulse block text-center">v2.2 PDF ACTIVE</span>
            <span className="text-[9px] text-[#6B705C] font-mono block text-center">Sync ID: {new Date().getTime().toString().slice(-6)}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "dashboard",    icon: LayoutDashboard, label: "Dashboard" },
            { id: "bmi",          icon: Activity,        label: "BMI Check" },
            { id: "history",      icon: History,         label: "History" },
            { id: "nutritionists",icon: MapPin,          label: "Nutritionists" },
            { id: "account",      icon: User,            label: "Account" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === tab.id ? "bg-primary/20 text-primary border border-primary/30" : "text-[#6B705C] hover:bg-[#4E342E]/5"
                }`}
            >
              <tab.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium hidden md:block">{tab.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-[#6B705C] hover:text-red-400 hover:bg-red-400/10 transition-all mt-auto"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium hidden md:block">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="p-6 md:p-8 flex items-center justify-between border-b border-[#4E342E]/5">
          <div>
            <h2 className="text-2xl font-bold">Namaste, {user.name}!</h2>
            <p className="text-[#6B705C] text-sm">{user.diet_type.charAt(0).toUpperCase() + user.diet_type.slice(1)} • {user.goal}</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="bg-[#4E342E]/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-[#4E342E]/10">
              <PlusCircle className="text-primary w-4 h-4" />
              <span className="text-xs font-medium">New Session</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                 {/* Feature Grid - Strictly Meal Plans */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                   {[
                     { title: "Daily Meal Plan", desc: "1-day nutrition", icon: Calendar, color: "text-primary", type: "daily" },
                     { title: "Weekly Schedule", desc: "Entire week", icon: Clock, color: "text-accent", type: "weekly" },
                     { title: "Specific Recipe", desc: "Healthy recipe", icon: Utensils, color: "text-orange-400", type: "specific" },
                   ].map((action, i) => (
                     <button
                       key={i}
                       onClick={() => { 
                         setPlanType(action.type); 
                         setIsConfiguringPlan(true); 
                         setActiveType("bill"); // Force bill mode
                       }}
                       className="glass p-8 rounded-3xl hover:bg-[#4E342E]/5 transition-all text-left border border-[#4E342E]/10 group relative pointer-events-auto"
                     >
                      <div className="flex items-center justify-between mb-4">
                        <action.icon className={`${action.color} w-8 h-8 group-hover:scale-110 transition-transform`} />
                        <div className="p-2 bg-[#4E342E]/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlusCircle size={16} className="text-[#6B705C]" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{action.title}</h3>
                      <p className="text-sm text-[#6B705C] font-medium">{action.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Empty Space for layout balance */}
                <div className="h-20"></div>

                {/* Results Modal */}
                <AnimatePresence>
                  {messages.length > 0 && !isConfiguringPlan && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 bg-[#D6CCC2]/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                      <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="max-w-3xl w-full glass rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border border-[#4E342E]/20"
                      >
                        <div className="p-6 border-b border-[#4E342E]/10 flex items-center justify-between bg-[#4E342E]/5">
                          <h3 className="text-xl font-bold flex items-center gap-2">
                             <Bot className="text-primary" /> NutriCoach Response
                          </h3>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const content = messages[messages.length - 1].content;
                                const blob = new Blob([content], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "NutriCoach-Plan.txt";
                                a.click();
                              }}
                              className="p-2 hover:bg-[#4E342E]/10 rounded-lg text-[#6B705C]"
                              title="Download TXT"
                            >
                              <Download size={20} />
                            </button>
                            <button onClick={() => setMessages([])} className="p-2 hover:bg-red-500/20 rounded-lg text-red-500">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                          {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                              <div className={`p-6 rounded-2xl ${m.role === "user" ? "bg-primary text-[#F5EBE0] font-bold shadow-md" : "bg-[#F5EBE0]/60 text-[#4E342E] italic shadow-sm"}`}>
                                {m.role === "assistant" ? <FormattedMessage content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-6 bg-[#4E342E]/5 border-t border-[#4E342E]/10 flex justify-center">
                          <button 
                            onClick={() => setMessages([])}
                            className="px-10 py-3 bg-primary text-[#F5EBE0] font-bold rounded-xl hover:bg-primary-hover transition shadow-md"
                          >
                            Done
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === "bmi" && (
              <motion.div key="bmi" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Calculator Input */}
                  <div className="flex-1 glass p-8 rounded-3xl space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-primary/20 p-3 rounded-2xl">
                        <Activity className="text-primary w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold">BMI Calculator</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-[#6B705C]">Height (cm)</label>
                        <input 
                          type="number" 
                          value={bmiHeight} 
                          onChange={e => setBmiHeight(e.target.value)} 
                          className="auth-input bg-[#4E342E]/5" 
                          placeholder="e.g. 175" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#6B705C]">Weight (kg)</label>
                        <input 
                          type="number" 
                          value={bmiWeight} 
                          onChange={e => setBmiWeight(e.target.value)} 
                          className="auth-input bg-[#4E342E]/5" 
                          placeholder="e.g. 70" 
                        />
                      </div>
                      <button 
                        onClick={calculateBmi}
                        className="w-full py-4 bg-primary text-[#F5EBE0] font-bold rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-[#6B705C]/20"
                      >
                        Calculate BMI
                      </button>
                    </div>
                  </div>

                  {/* BMI Results */}
                  <div className="flex-1 flex flex-col gap-6">
                    {bmiResult ? (() => {
                      const bmiCat = getBmiCategory(bmiResult);
                      const Icon = bmiCat.icon;
                      return (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }} 
                          animate={{ opacity: 1, scale: 1 }}
                          className="glass p-8 rounded-3xl flex-1 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden"
                        >
                          <div className={`absolute top-0 right-0 p-4 ${bmiCat.color}`}>
                            <Icon size={48} className="opacity-10" />
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[#6B705C] text-sm font-bold uppercase tracking-widest">Your BMI Score</p>
                            <h2 className="text-6xl font-black gradient-text">{bmiResult}</h2>
                          </div>

                          <div className={`px-6 py-2 rounded-full font-bold text-sm ${bmiCat.bg} ${bmiCat.color} ${bmiCat.border} border`}>
                            {bmiCat.label}
                          </div>

                          <div className="w-full pt-4">
                            <div className="h-2 w-full bg-[#4E342E]/10 rounded-full overflow-hidden flex">
                              <div className="h-full bg-blue-400" style={{ width: "18.5%" }} />
                              <div className="h-full bg-green-400" style={{ width: "6.5%" }} />
                              <div className="h-full bg-yellow-400" style={{ width: "5%" }} />
                              <div className="h-full bg-red-400" style={{ width: "70%" }} />
                            </div>
                            <div className="relative w-full h-4 mt-1">
                              <div 
                                className="absolute top-0 w-1 h-3 bg-[#4E342E] shadow-xl transition-all duration-1000" 
                                style={{ left: `${Math.min(Math.max((bmiResult / 50) * 100, 0), 100)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-[#6B705C] mt-2 flex justify-between px-1 font-bold">
                              <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
                            </p>
                          </div>

                          <div className="pt-4 text-sm text-[#6B705C]">
                            <p className="font-medium">Ideal weight for your height:</p>
                            <p className="text-[#4E342E] font-black text-lg">
                              {(18.5 * (parseFloat(bmiHeight)/100)**2).toFixed(1)}kg - {(24.9 * (parseFloat(bmiHeight)/100)**2).toFixed(1)}kg
                            </p>
                          </div>
                        </motion.div>
                      );
                    })() : (
                      <div className="glass p-8 rounded-3xl flex-1 flex flex-col items-center justify-center text-center text-[#6B705C] border-dashed border-2 border-[#6B705C]/20 font-medium">
                        <Activity size={48} className="mb-4 opacity-20" />
                        <p>Calculate your BMI to see results and diet tips here.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Tips Section */}
                {bmiResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass p-8 rounded-3xl border-[#6B705C]/30 bg-[#F5EBE0]/60 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Bot className="text-[#6B705C] w-6 h-6" />
                        <h3 className="text-xl font-bold">AI Diet Recommendations</h3>
                      </div>
                      <button 
                        onClick={getAiBmiTip}
                        disabled={isLoadingBmiTip}
                        className="px-6 py-2 bg-[#CB997E] text-[#F5EBE0] text-sm font-bold rounded-xl hover:bg-[#CB997E]/90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                      >
                        {isLoadingBmiTip ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                        {bmiTip ? "Regenerate Tips" : "Get Personalized Tips"}
                      </button>
                    </div>

                    {bmiTip ? (
                      <div className="prose prose-stone max-w-none text-[#4E342E] font-medium">
                        <FormattedMessage content={bmiTip} />
                      </div>
                    ) : (
                      <p className="text-[#6B705C] italic text-sm text-center py-4 font-medium">Click "Get Personalized Tips" to see how to reach your ideal weight.</p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
                <h3 className="text-xl font-bold">Meal History</h3>
                {!user.meal_history?.length ? (
                  <div className="text-center py-20 text-[#6B705C]">No saved plans yet.</div>
                ) : (
                  user.meal_history.map((h, i) => (
                    <div key={i} className="glass p-6 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className={`px-3 py-1 rounded-full font-bold ${h.type === "Medical Report" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>{h.type}</span>
                        <span className="text-[#6B705C]">{h.timestamp}</span>
                      </div>
                      <div className="text-[#4E342E] text-sm line-clamp-3">{h.content}</div>
                      <button
                        onClick={() => { setActiveTab("dashboard"); setMessages([...messages, { role: "assistant", content: h.content }]); }}
                        className="text-primary text-xs font-bold hover:underline"
                      >
                        View Full Details →
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === "nutritionists" && (
              <motion.div key="nutritionists" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Find Local Experts</h3>
                  <p className="text-[#6B705C]">Search for nutritionists and dietitians in your city.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
                    <input
                      value={searchCity}
                      onChange={e => setSearchCity(e.target.value)}
                      placeholder="Enter city (e.g. Mumbai, Delhi)..."
                      className="w-full bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary/50"
                    />
                  </div>
                  <button
                    onClick={handleNutritionistSearch}
                    disabled={isSearching}
                    className="bg-primary text-[#F5EBE0] font-bold px-8 rounded-2xl hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isSearching && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai"].map(city => (
                    <button
                      key={city}
                      onClick={() => { setSearchCity(city); setTimeout(handleNutritionistSearch, 100); }}
                      className="px-4 py-2 rounded-full border border-[#4E342E]/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-[#6B705C] hover:text-primary"
                    >
                      {city}
                    </button>
                  ))}
                </div>

                {/* AI Disclaimer */}
                {nutritionists.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-600 text-xs">
                    <span className="text-lg">⚠️</span>
                    <p><strong>AI-generated results.</strong> Always verify the address on Google Maps before visiting. Results are filtered to show only listings mentioning <strong>{searchCity}</strong>.</p>
                  </div>
                )}

                {nutritionists.length === 0 && !isSearching && (
                  <div className="text-center py-20 glass rounded-3xl border border-dashed border-[#4E342E]/10">
                    <MapPin className="w-12 h-12 text-[#4E342E]/20 mx-auto mb-4" />
                    <p className="text-[#6B705C] font-medium">Search for your city or locality to find nutritionists near you.</p>
                    <p className="text-[#6B705C] text-xs mt-2">Try specific areas like "Vile Parle", "Koramangala", "CP Delhi"</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {nutritionists.map((n, i) => (
                    <div key={i} className="glass p-6 rounded-3xl border border-[#4E342E]/5 hover:border-primary/30 transition-all">
                      <h4 className="text-lg font-bold text-primary">{n.name}</h4>
                      <p className="text-sm italic text-[#6B705C]">{n.specialty}</p>
                      <div className="flex items-center gap-2 text-xs mt-4 text-[#4E342E]">
                        <MapPin className="w-3 h-3 text-red-500" /> {n.area}
                      </div>
                      {n.instagram && n.instagram !== "N/A" && (
                        <p className="text-xs mt-2 text-pink-600 font-mono">{n.instagram}</p>
                      )}
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(n.name + " nutritionist " + n.area)}`, "_blank")}
                          className="flex-1 py-3 bg-[#4E342E]/5 hover:bg-[#4E342E]/10 rounded-xl text-xs font-bold border border-[#4E342E]/10"
                        >
                          📍 Verify on Maps
                        </button>
                        <button
                          onClick={() => {
                            const handle = n.instagram && n.instagram !== "N/A" && n.instagram.startsWith("@")
                              ? `https://instagram.com/${n.instagram.replace("@", "")}`
                              : `https://www.instagram.com/explore/tags/${n.name.replace(/\s+/g, "").toLowerCase()}/`;
                            window.open(handle, "_blank");
                          }}
                          className="flex-1 py-3 bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 rounded-xl text-xs font-bold border border-pink-500/20"
                        >
                          Instagram
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "account" && (
              <motion.div key="account" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center border-2 border-primary/30">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold">{user.name}</h3>
                    <p className="text-[#6B705C]">NutriCoach User since {new Date().getFullYear()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-3xl space-y-4">
                      <h4 className="font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Profile Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-[#4E342E]/5 pb-2 text-sm">
                          <span className="text-[#6B705C]">Age</span><span>{user.age} Years</span>
                        </div>
                        <div className="flex justify-between border-b border-[#4E342E]/5 pb-2 text-sm">
                          <span className="text-[#6B705C]">Height</span><span>{user.height} cm</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6B705C]">Weight</span><span>{user.weight} kg</span>
                        </div>
                      </div>
                    </div>

                  <div className="glass p-6 rounded-3xl space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> Diet & Goal</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-[#4E342E]/5 pb-2">
                        <span className="text-[#6B705C]">Diet Type</span><span className="capitalize">{user.diet_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6B705C]">Current Goal</span><span className="text-primary font-bold">{user.goal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl space-y-6 border-accent/20 border-2">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold flex items-center gap-2 text-2xl italic text-accent"><FileText className="w-6 h-6" /> Medical Insights</h4>
                      <p className="text-xs text-[#6B705C] font-bold uppercase tracking-wider text-green-600">Note: Upload Photo, Screenshot, or PDF</p>
                    </div>
                    <button 
                      onClick={() => { setActiveType("report"); fileInputRef.current?.click(); }}
                      disabled={isLoading}
                      className="w-full md:w-auto px-8 py-4 bg-accent text-[#F5EBE0] rounded-2xl font-bold hover:bg-accent/90 transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && activeType === "report" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                      {isLoading && activeType === "report" ? "Analyzing..." : "Upload Now"}
                    </button>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/20 min-h-[120px] text-[#4E342E] italic text-sm leading-relaxed backdrop-blur-sm">
                    {user.health_advisor || "No health reports analyzed yet. Please upload your medical report to get personalized AI insights."}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Ingredient Book Modal */}
      <AnimatePresence>
        {isConfiguringPlan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#4E342E]/80 backdrop-blur-md flex items-start justify-center p-4 md:p-10 overflow-y-auto"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="max-w-md w-full glass p-6 md:p-10 rounded-3xl space-y-6 relative border border-[#4E342E]/20 my-auto shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
                  <Utensils className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-primary text-center w-full">Ingredient Book</h3>
                <p className="text-[#6B705C] capitalize text-center w-full">{planType} Configuration</p>
              </div>

              {planType === "specific" && (
                <div className="flex gap-2 justify-center">
                  {(["Breakfast", "Lunch", "Dinner"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setMealTime(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${mealTime === t ? "bg-primary text-[#F5EBE0] border-primary" : "bg-[#4E342E]/5 text-[#6B705C] border-[#4E342E]/10 hover:border-[#4E342E]/20"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="relative">
                <textarea
                  value={ingredients}
                  onChange={e => setIngredients(e.target.value)}
                  placeholder="List your available ingredients here..."
                  className="w-full h-24 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-[#4E342E] resize-none text-sm"
                />
                {isScanningInModal && (
                  <div className="absolute inset-0 bg-[#D6CCC2]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-primary gap-2">
                    <Loader2 className="animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-center">Reading Bill...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <button 
                  onClick={() => { setActiveType("bill"); fileInputRef.current?.click(); }}
                  className="py-4 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#4E342E]/10 transition text-xs md:text-sm"
                >
                  <ImageIcon className="w-4 h-4 text-primary" /> Scan Bill
                </button>
                <button 
                  onClick={() => startVoice((text) => setIngredients(prev => prev ? `${prev}, ${text}` : text))}
                  className={`py-4 bg-[#4E342E]/5 border border-[#4E342E]/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#4E342E]/10 transition text-xs md:text-sm ${isListening ? "border-primary text-primary" : ""}`}
                >
                  <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} /> 
                  {isListening ? "Listening..." : "Voice Input"}
                </button>
                <button 
                  onClick={generateMealPlanFromConfig}
                  className="col-span-2 lg:col-span-1 py-4 bg-primary text-[#F5EBE0] rounded-2xl font-bold hover:bg-primary-hover transition text-xs md:text-sm shadow-lg shadow-[#6B705C]/20"
                >
                  Generate Plan
                </button>
              </div>
              <button onClick={() => { setIsConfiguringPlan(false); setPlanType(null); }} className="w-full text-[#6B705C] hover:text-[#4E342E] transition text-sm text-center">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        id="bill-scan-input" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*,application/pdf" 
        hidden 
      />
    </div>
  );
}
