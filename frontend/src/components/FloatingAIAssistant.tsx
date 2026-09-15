import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, X, Send, Mic, Globe, Check, AlertCircle, RefreshCw, XCircle, Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

const SUGGESTED_QUESTIONS = [
  "How much can I save this month?",
  "Where am I spending the most?",
  "Create a budget for me.",
  "How can I reduce my expenses?",
  "Explain SIP.",
  "Calculate EMI for ₹5 lakh.",
  "How much should I save for my goal?"
];

// Language Options
const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ar', name: 'Arabic (العربية)' }
];

interface ChatMessage {
  data?: any;
  id: string;
  role: 'user' | 'model';
  content: string;
  intent?: any;
}

export const FloatingAIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    let userMsg = input.trim();
    if (language !== 'auto') {
      const langName = LANGUAGES.find(l => l.code === language)?.name;
      userMsg = `[Language context: Please reply in ${langName}]. ${userMsg}`;
    }

    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: userMsg };
    setMessages(prev => [...prev, { id: newMessage.id, role: 'user', content: input.trim() }]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.post('/ai/chat', {
        message: userMsg,
        history: history
      });

      const data = response.data;
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.text,
        intent: data.intent
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "Sorry, I am temporarily unavailable. Please try again later."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedClick = (q: string) => {
    setInput(q);
    // Use a small timeout to let state update, though strictly we should pass `q` to handleSend, 
    // but handleSend reads from `input` state which is async. We can modify handleSend to take an optional string.
  };

  // Improved handleSend to accept explicit text
  const submitMessage = async (textToSubmit: string = input) => {
    if (!textToSubmit.trim()) return;

    let userMsg = textToSubmit.trim();
    if (language !== 'auto') {
      const langName = LANGUAGES.find(l => l.code === language)?.name;
      userMsg = `[Language context: Please reply in ${langName}]. ${userMsg}`;
    }

    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: userMsg };
    setMessages(prev => [...prev, { id: newMessage.id, role: 'user', content: textToSubmit.trim() }]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await api.post('/ai/chat', {
        message: userMsg,
        history: history
      });

      const data = response.data;
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.text,
        intent: data.intent,
        data: data.data
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "Sorry, I am temporarily unavailable. Please try again later."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use text input.");
      return;
    }

    const recognition = new SpeechRecognition();
    if (language !== 'auto') {
      recognition.lang = language;
    }
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const confirmTransaction = async (intent: any, messageId: string) => {
    try {
      await api.post('/transactions', {
        amount: intent.amount,
        type: intent.transaction_type,
        category: intent.category,
        description: intent.description || "Added via AI",
        transaction_date: new Date().toISOString().split('T')[0],
        account_id: 1 // We default to account ID 1 for now, a proper implementation would fetch user's main account
      });

      // Update message to show it was added
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, content: `${m.content}\n\n✅ **Transaction Added Successfully!**`, intent: null }
          : m
      ));
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, content: `${m.content}\n\n❌ **Failed to add transaction.**`, intent: null }
          : m
      ));
    }
  };

  const cancelTransaction = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, content: `${m.content}\n\n❌ **Cancelled.**`, intent: null }
        : m
    ));
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-2xl shadow-emerald-500/40 flex items-center justify-center text-white hover:scale-105 transition-transform z-50 group"
        >
          <MessageSquare size={24} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-card/95 border border-border/80 rounded-2xl shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex justify-between items-center bg-accent/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Expense AI</h3>
                <p className="text-[10px] text-emerald-400">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearChat} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors" title="Clear Chat">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col h-full justify-center items-center text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <span className="text-4xl">🤖</span>
                </div>
                <h3 className="font-bold text-foreground text-lg">Hi! I am Expense AI.</h3>
                <p className="text-sm mt-2 max-w-[250px]">I can help you analyze your spending, create budgets, and explain financial concepts.</p>

                <div className="mt-6 w-full flex flex-col gap-2">
                  {SUGGESTED_QUESTIONS.slice(0, 4).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => submitMessage(q)}
                      className="text-xs bg-accent/50 hover:bg-emerald-500/20 hover:text-emerald-400 border border-border/40 hover:border-emerald-500/30 text-left px-3 py-2 rounded-xl transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-sm'
                    : 'bg-accent/60 text-foreground rounded-tl-sm border border-border/40 prose prose-invert prose-p:leading-snug prose-sm max-w-none'
                    }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content.replace(/\[Language context:.*?\]\. /, '')}</div>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>

                {/* Data Chart Rendering */}
                {msg.data && msg.data.items && msg.data.items.length > 0 && (
                  <div className="mt-2 w-full max-w-[85%] bg-card border border-border/50 rounded-xl p-3 shadow-sm">
                    {msg.data.title && <h4 className="text-xs font-bold text-muted-foreground mb-3">{msg.data.title}</h4>}
                    <div className="space-y-2">
                      {msg.data.items.map((item: any, idx: number) => {
                        const maxVal = Math.max(...msg.data.items.map((i: any) => i.value));
                        const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                        return (
                          <div key={idx} className="relative">
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="truncate pr-2">{item.name}</span>
                              <span className="font-bold">₹{item.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-accent rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transaction Confirmation Card */}
                {msg.intent && msg.intent.type === 'add_transaction' && (
                  <div className="mt-2 w-full max-w-[85%] bg-card border border-emerald-500/30 rounded-xl p-3 shadow-lg shadow-emerald-500/5">
                    <h4 className="text-xs font-bold text-emerald-400 mb-2 border-b border-border/50 pb-1">Transaction Details</h4>
                    <div className="space-y-1 text-xs mb-3 text-muted-foreground">
                      <div className="flex justify-between"><span className="font-medium">Type:</span> <span>{msg.intent.transaction_type}</span></div>
                      <div className="flex justify-between"><span className="font-medium">Amount:</span> <span className="font-bold text-foreground">₹{msg.intent.amount}</span></div>
                      <div className="flex justify-between"><span className="font-medium">Category:</span> <span>{msg.intent.category}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmTransaction(msg.intent, msg.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        <Check size={14} /> Add
                      </button>
                      <button
                        onClick={() => cancelTransaction(msg.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold rounded-lg transition-colors"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start">
                <div className="bg-accent/60 p-3 rounded-2xl rounded-tl-sm border border-border/40 flex gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-border/50 bg-card/60">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-muted-foreground" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs text-muted-foreground outline-none cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code} className="bg-card text-foreground">{lang.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitMessage()}
                placeholder="Ask me anything..."
                className="flex-1 bg-accent/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 pr-10"
              />
              <button
                onClick={handleVoiceInput}
                className={`absolute right-12 p-1.5 rounded-lg transition-colors ${isListening ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-muted-foreground hover:text-emerald-400'}`}
              >
                <Mic size={18} />
              </button>
              <button
                onClick={() => submitMessage()}

                disabled={!input.trim() || isTyping}
                className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} className={input.trim() && !isTyping ? "ml-0.5" : ""} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
