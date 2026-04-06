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
  Youtube
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UserProfile {
  name: string;
  username: string;
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "history" | "nutritionists" | "account">("dashboard");
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

  // Load settings from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("nutricoach_user");
    if (savedUser) setUser(JSON.parse(savedUser));
    const savedKey = localStorage.getItem("nutricoach_key");
    if (savedKey) setApiKey(savedKey);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (user) localStorage.setItem("nutricoach_user", JSON.stringify(user));
    if (apiKey) localStorage.setItem("nutricoach_key", apiKey);
  }, [user, apiKey]);

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
    const prompt = `I am using my Ingredient Book. ${healthContext} Plan type: ${planType}. ${planType === "specific" ? `Specifically for ${mealTime}. ` : ""}${ingredients ? `Ingredients available: ${ingredients}.` : "Suggest healthy recipes."} Please provide the plan with clickable YouTube recipe links using the format [Watch Recipe](URL).`;
    
    setIsConfiguringPlan(false);
    handleSend(prompt);
    setPlanType(null);
    setIngredients("");
  };

  const handleNutritionistSearch = async () => {
    if (!searchCity.trim()) return;
    setIsSearching(true);
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
        const parsed = lines.map((l: string) => {
          const [name, specialty, area, notable] = l.split("|").map(s => s.trim().replace(/^[-*]\s*/, ""));
          return { name, specialty, area, notable };
        });
        setNutritionists(parsed);
      }
    } catch (error) {
      alert("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const startVoice = () => {
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
      handleSend(transcript);
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0a]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl w-full max-w-md space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="bg-primary/20 p-4 rounded-2xl w-fit mx-auto border border-primary/30">
              <Leaf className="text-primary w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Welcome to NutriCoach</h1>
            <p className="text-gray-400">Your Personal AI Indian Nutritionist</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries()) as any;
              setUser({ ...data, meal_history: [] });
            }}
            className="space-y-4"
          >
            <input name="name" placeholder="Full Name" required className="auth-input" />
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
            <button className="w-full py-4 bg-primary text-black font-bold rounded-2xl hover:bg-primary-hover transition-all mt-4">
              Start Your Journey
            </button>
          </form>
        </motion.div>

        <style jsx>{`
          .auth-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            padding: 0.75rem 1rem;
            color: white;
            outline: none;
            transition: border-color 0.2s;
          }
          .auth-input:focus { border-color: #22c55e; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 glass border-r border-white/10 flex flex-col p-4 md:p-6 transition-all">
        <div className="flex items-center gap-3 mb-10 px-2 flex-col items-start">
          <div className="flex items-center gap-3">
            <Leaf className="text-primary w-8 h-8 shrink-0" />
            <h1 className="text-xl font-bold gradient-text hidden md:block">NutriCoach</h1>
          </div>
          <div className="mt-2 space-y-1 hidden md:block">
            <span className="text-[12px] text-green-500 font-bold uppercase tracking-[0.2em] bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 animate-pulse block text-center">v2.2 PDF ACTIVE</span>
            <span className="text-[9px] text-gray-600 font-mono block text-center">Sync ID: {new Date().getTime().toString().slice(-6)}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { id: "history", icon: History, label: "History" },
            { id: "nutritionists", icon: MapPin, label: "Nutritionists" },
            { id: "account", icon: User, label: "Account" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === tab.id ? "bg-primary/20 text-primary border border-primary/30" : "text-gray-400 hover:bg-white/5"
                }`}
            >
              <tab.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium hidden md:block">{tab.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={() => { localStorage.clear(); setUser(null); window.location.reload(); }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all mt-auto"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium hidden md:block">Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="p-6 md:p-8 flex items-center justify-between border-b border-white/5">
          <div>
            <h2 className="text-2xl font-bold">Namaste, {user.name}!</h2>
            <p className="text-gray-400 text-sm">{user.diet_type.charAt(0).toUpperCase() + user.diet_type.slice(1)} • {user.goal}</p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
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
                       className="glass p-8 rounded-3xl hover:bg-white/5 transition-all text-left border border-white/10 group relative pointer-events-auto"
                     >
                      <div className="flex items-center justify-between mb-4">
                        <action.icon className={`${action.color} w-8 h-8 group-hover:scale-110 transition-transform`} />
                        <div className="p-2 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlusCircle size={16} className="text-gray-400" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{action.title}</h3>
                      <p className="text-sm text-gray-400 font-medium">{action.desc}</p>
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
                      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                      <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="max-w-3xl w-full glass rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20"
                      >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
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
                              className="p-2 hover:bg-white/10 rounded-lg text-gray-400"
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
                              <div className={`p-6 rounded-2xl ${m.role === "user" ? "bg-primary text-black font-bold" : "bg-white/5 text-gray-100 italic"}`}>
                                {m.role === "assistant" ? <FormattedMessage content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-center">
                          <button 
                            onClick={() => setMessages([])}
                            className="px-10 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition"
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

            {activeTab === "history" && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
                <h3 className="text-xl font-bold">Meal History</h3>
                {!user.meal_history?.length ? (
                  <div className="text-center py-20 text-gray-500">No saved plans yet.</div>
                ) : (
                  user.meal_history.map((h, i) => (
                    <div key={i} className="glass p-6 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className={`px-3 py-1 rounded-full font-bold ${h.type === "Medical Report" ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>{h.type}</span>
                        <span className="text-gray-500">{h.timestamp}</span>
                      </div>
                      <div className="text-gray-300 text-sm line-clamp-3">{h.content}</div>
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
                  <p className="text-gray-400">Search for nutritionists and dietitians in your city.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
                    <input
                      value={searchCity}
                      onChange={e => setSearchCity(e.target.value)}
                      placeholder="Enter city (e.g. Mumbai, Delhi)..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary/50"
                    />
                  </div>
                  <button
                    onClick={handleNutritionistSearch}
                    disabled={isSearching}
                    className="bg-primary text-black font-bold px-8 rounded-2xl hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center gap-2"
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
                      className="px-4 py-2 rounded-full border border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-gray-400 hover:text-primary"
                    >
                      {city}
                    </button>
                  ))}
                </div>

                {nutritionists.length === 0 && !isSearching && (
                  <div className="text-center py-20 glass rounded-3xl border border-dashed border-white/10">
                    <MapPin className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Search for your city to find top-rated nutritionists near you.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {nutritionists.map((n, i) => (
                    <div key={i} className="glass p-6 rounded-3xl border border-white/5 hover:border-primary/30 transition-all">
                      <h4 className="text-lg font-bold text-primary">{n.name}</h4>
                      <p className="text-sm italic text-gray-400">{n.specialty}</p>
                      <div className="flex items-center gap-2 text-xs mt-4 text-gray-300">
                        <MapPin className="w-3 h-3 text-red-500" /> {n.area}
                      </div>
                      <p className="text-sm mt-4 text-gray-400">{n.notable}</p>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => window.open(`https://www.google.com/maps/search/${n.name.replace(/\s+/g, "+")}+${n.area.replace(/\s+/g, "+")}`, "_blank")}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold border border-white/10"
                        >
                          View Map
                        </button>
                        <button
                          onClick={() => window.open(`https://www.google.com/search?q=${n.name.replace(/\s+/g, "+")}+nutritionist+instagram`, "_blank")}
                          className="flex-1 py-3 bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 rounded-xl text-xs font-bold border border-pink-500/20"
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
                    <p className="text-gray-400">NutriCoach User since {new Date().getFullYear()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-3xl space-y-4">
                      <h4 className="font-bold flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Profile Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
                          <span className="text-gray-400">Age</span><span>{user.age} Years</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2 text-sm">
                          <span className="text-gray-400">Height</span><span>{user.height} cm</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Weight</span><span>{user.weight} kg</span>
                        </div>
                      </div>
                    </div>

                  <div className="glass p-6 rounded-3xl space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><Leaf className="w-4 h-4 text-primary" /> Diet & Goal</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Diet Type</span><span className="capitalize">{user.diet_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Goal</span><span className="text-primary font-bold">{user.goal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl space-y-6 border-accent/20 border-2">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold flex items-center gap-2 text-2xl italic text-accent"><FileText className="w-6 h-6" /> Medical Insights</h4>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider text-green-500">Note: Upload Photo, Screenshot, or PDF</p>
                    </div>
                    <button 
                      onClick={() => { setActiveType("report"); fileInputRef.current?.click(); }}
                      disabled={isLoading}
                      className="w-full md:w-auto px-8 py-4 bg-accent text-black rounded-2xl font-bold hover:bg-accent/90 transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && activeType === "report" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                      {isLoading && activeType === "report" ? "Analyzing..." : "Upload Now"}
                    </button>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/20 min-h-[120px] text-gray-300 italic text-sm leading-relaxed backdrop-blur-sm">
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
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-start justify-center p-4 md:p-10 overflow-y-auto"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="max-w-md w-full glass p-6 md:p-10 rounded-3xl space-y-6 relative border border-white/20 my-auto shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
                  <Utensils className="text-primary w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-primary text-center w-full">Ingredient Book</h3>
                <p className="text-gray-400 capitalize text-center w-full">{planType} Configuration</p>
              </div>

              {planType === "specific" && (
                <div className="flex gap-2 justify-center">
                  {(["Breakfast", "Lunch", "Dinner"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setMealTime(t)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${mealTime === t ? "bg-primary text-black border-primary" : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"}`}
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
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-white resize-none text-sm"
                />
                {isScanningInModal && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-primary gap-2">
                    <Loader2 className="animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest text-center">Reading Bill...</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setActiveType("bill"); fileInputRef.current?.click(); }}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition"
                >
                  <ImageIcon className="w-4 h-4" /> Scan Bill
                </button>
                <button 
                  onClick={generateMealPlanFromConfig}
                  className="flex-1 py-4 bg-primary text-black rounded-2xl font-bold hover:bg-primary/90 transition"
                >
                  Generate
                </button>
              </div>
              <button onClick={() => { setIsConfiguringPlan(false); setPlanType(null); }} className="w-full text-gray-500 hover:text-white transition text-sm text-center">Close</button>
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
