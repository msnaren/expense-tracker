import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, User, Trash2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
  data?: any;
};

const SUGGESTED_QUESTIONS = [
  "How much did I spend this month?",
  "Where am I spending the most?",
  "Compare this month with last month.",
  "What is my average daily spending?",
  "How much can I save this month?"
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const formatMessageContent = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
};

export const SpendWiseAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hi! I am SpendWise AI, your personal financial assistant. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await api.post('/ai/chat', { message: text, history });
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: res.data.text,
        data: res.data.data
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: 'Oops! I encountered an issue accessing the AI model. Let me analyze your records directly!'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'model',
      content: 'Hi! I am SpendWise AI, your personal financial assistant. How can I help you today?'
    }]);
  };

  const renderData = (data: any) => {
    if (!data || !data.items || data.items.length === 0) return null;

    if (data.type === 'bar') {
      return (
        <div className="mt-4 h-64 w-full bg-background/50 rounded-xl p-4 border border-border">
          {data.title && <h4 className="text-sm font-semibold mb-2">{data.title}</h4>}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.items} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} 
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (data.type === 'pie') {
      return (
        <div className="mt-4 h-64 w-full bg-background/50 rounded-xl p-4 border border-border">
          {data.title && <h4 className="text-sm font-semibold mb-2">{data.title}</h4>}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.items}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.items.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (data.type === 'metric') {
      return (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.items.map((item: any, idx: number) => (
            <div key={idx} className="bg-background/50 p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center">
              <span className="text-sm text-muted-foreground">{item.name}</span>
              <span className="text-2xl font-bold text-foreground">₹{item.value}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-bold text-foreground">SpendWise AI</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
            </p>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors flex items-center gap-2"
          title="Clear Chat"
        >
          <Trash2 size={18} />
          <span className="hidden sm:inline text-sm font-medium">Clear</span>
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <p>AI predictions and responses are based on your provided data and are not guaranteed financial advice.</p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/20 text-primary'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-card border border-border text-card-foreground rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }} />
                </div>
                {msg.data && renderData(msg.data)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%] flex-row">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
                <Bot size={16} />
              </div>
              <div className="px-4 py-4 rounded-2xl bg-card border border-border rounded-tl-sm flex items-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 text-xs bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full transition-colors border border-border"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex items-center gap-2 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your finances..."
            className="flex-1 bg-background border border-border rounded-full px-5 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
