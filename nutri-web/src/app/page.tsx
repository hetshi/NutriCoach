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
  Clock
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
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm NutriCoach, your AI Indian Nutritionist. How can I help you today?" }
  ]);
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

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("nutricoach_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Save user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("nutricoach_user", JSON.stringify(user));
    }
  }, [user]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, user }),
      });

      if (!response.ok) {
        throw new Error(`AI error: ${response.status}. Please check your API key on Render.`);
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
    const prompt = planType === "daily" 
      ? `Generate a 1-day meal plan. ${ingredients ? `Ingredients I have: ${ingredients}` : "Use standard healthy options."}`
      : planType === "weekly"
      ? `Generate a 7-day Indian meal plan. ${ingredients ? `Use these ingredients: ${ingredients}` : "Vary the dishes."}`
      : `Suggest a specific healthy recipe. ${ingredients ? `I have: ${ingredients}` : ""}`;
    
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
        headers: { "Content-Type": "application/json" },
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
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", activeType);
    try {
      const response = await fetch("/api/scan", { method: "POST", body: formData });
      const data = await response.json();
      if (data.content) {
        if (activeType === "bill") {
          if (isConfiguringPlan) {
            setIngredients(prev => prev ? `${prev}, ${data.content}` : data.content);
          } else {
            setInput(`I have these ingredients: ${data.content}. Suggest a healthy Indian meal.`);
          }
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: `Medical Analysis: ${data.content}` }]);
          setUser(prev => prev ? ({ ...prev, health_advisor: data.content }) : null);
        }
      }
    } catch (error) {
      alert("Failed to scan file");
    } finally {
      setIsLoading(false);
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
        <div className="flex items-center gap-3 mb-10 px-2">
          <Leaf className="text-primary w-8 h-8 shrink-0" />
          <h1 className="text-xl font-bold gradient-text hidden md:block">NutriCoach</h1>
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
          onClick={() => { localStorage.removeItem("nutricoach_user"); setUser(null); }}
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
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Daily Meal Plan", icon: Calendar, color: "text-primary", type: "daily" },
                    { title: "Weekly Schedule", icon: Clock, color: "text-accent", type: "weekly" },
                    { title: "Specific Recipe", icon: Utensils, color: "text-orange-400", type: "specific" },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => { setPlanType(action.type); setIsConfiguringPlan(true); }}
                      className="glass p-6 rounded-2xl hover:bg-white/5 transition-all text-left border border-white/10 group group"
                    >
                      <action.icon className={`${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                      <h3 className="font-bold">{action.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">Get AI recommendations instantly</p>
                    </button>
                  ))}
                </div>

                {/* Chat Interface */}
                <div className="glass rounded-3xl flex flex-col h-[600px] overflow-hidden relative">
                  {isConfiguringPlan && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 z-20 bg-[#0a0a0a]/95 flex items-center justify-center p-6"
                    >
                      <div className="max-w-md w-full space-y-6">
                        <div className="text-center space-y-2">
                          <h3 className="text-2xl font-bold text-primary capitalize">{planType} Planner</h3>
                          <p className="text-gray-400">What ingredients do you have? (Optional)</p>
                        </div>
                        <textarea
                          value={ingredients}
                          onChange={e => setIngredients(e.target.value)}
                          placeholder="e.g. Tomato, Paneer, Spinach..."
                          className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-white"
                        />
                        <div className="flex gap-4">
                          <button 
                            onClick={() => { setActiveType("bill"); fileInputRef.current?.click(); }}
                            className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4" /> Scan Bill
                          </button>
                          <button 
                            onClick={generateMealPlanFromConfig}
                            className="flex-1 py-4 bg-primary text-black rounded-2xl font-bold"
                          >
                            Generate
                          </button>
                        </div>
                        <button onClick={() => setIsConfiguringPlan(false)} className="w-full text-gray-500 hover:text-white transition">Cancel</button>
                      </div>
                    </motion.div>
                  )}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] flex gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-accent/20 border border-accent/30" : "bg-primary/20 border border-primary/30"}`}>
                            {m.role === "user" ? <User className="w-4 h-4 text-accent" /> : <Bot className="w-4 h-4 text-primary" />}
                          </div>
                          <div className={`p-4 rounded-2xl ${m.role === "user" ? "bg-accent/10 text-white" : "bg-white/5 text-gray-200"}`}>
                            {m.role === "assistant" ? <FormattedMessage content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start items-center gap-2 text-primary">
                        <Loader2 className="animate-spin w-4 h-4" />
                        <span className="text-sm">AI Chef is thinking...</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-3">
                    <button onClick={() => { setActiveType("bill"); fileInputRef.current?.click(); }} className="p-3 text-gray-400 hover:text-primary transition-all"><ImageIcon className="w-5 h-5" /></button>
                    <div className="flex-1 relative">
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSend()}
                        placeholder="Ask anything..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50"
                      />
                      <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-black rounded-lg"><Send className="w-4 h-4" /></button>
                    </div>
                    <button onClick={startVoice} className={`p-3 rounded-xl ${isListening ? "bg-red-500 animate-pulse" : "bg-accent/20 text-accent border border-accent/20"}`}><Mic className="w-5 h-5" /></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => { setActiveType("bill"); fileInputRef.current?.click(); }} className="glass p-5 rounded-2xl flex items-center justify-center gap-3"><ImageIcon className="text-primary"/> Scan Bill</button>
                  <button onClick={() => { setActiveType("report"); fileInputRef.current?.click(); }} className="glass p-5 rounded-2xl flex items-center justify-center gap-3"><FileText className="text-accent"/> Analyze Reports</button>
                </div>
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
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">{h.type}</span>
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
                    className="bg-primary text-black font-bold px-8 rounded-2xl hover:bg-primary-hover disabled:opacity-50"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </div>

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
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Age</span><span>{user.age} Years</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Height</span><span>{user.height} cm</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Weight</span><span>{user.weight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">BMI</span><span className="font-bold text-primary">{(Number(user.weight) / Math.pow(Number(user.height) / 100, 2)).toFixed(1)}</span>
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

                <div className="glass p-8 rounded-3xl space-y-4">
                  <h4 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-accent" /> Medical Insights</h4>
                  <div className="p-6 bg-accent/5 rounded-2xl border border-accent/20 min-h-[100px] text-gray-300 italic text-sm leading-relaxed">
                    {user.health_advisor || "No health reports analyzed yet. Upload a report in the Dashboard to see AI insights here."}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <input type="file" id="bill-scan-input" ref={fileInputRef} onChange={handleFileUpload} hidden />
    </div>
  );
}
