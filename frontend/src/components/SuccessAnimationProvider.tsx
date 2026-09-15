import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type AnimationType = 'money' | 'success' | 'celebration';

interface SuccessMessage {
  id: string;
  message: string;
  type: AnimationType;
}

interface SuccessContextType {
  triggerSuccess: (message: string, type?: AnimationType) => void;
}

const SuccessContext = createContext<SuccessContextType | undefined>(undefined);

export const useSuccess = () => {
  const context = useContext(SuccessContext);
  if (!context) {
    throw new Error('useSuccess must be used within a SuccessProvider');
  }
  return context;
};

export const SuccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<SuccessMessage[]>([]);

  const triggerSuccess = (message: string, type: AnimationType = 'success') => {
    const id = Date.now().toString();
    setMessages(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 3000);
  };

  const getEmoji = (type: AnimationType) => {
    switch (type) {
      case 'money': return '💰';
      case 'success': return '✅';
      case 'celebration': return '🎉';
      default: return '✨';
    }
  };

  return (
    <SuccessContext.Provider value={{ triggerSuccess }}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center gap-2">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="bg-card/90 backdrop-blur-md border border-emerald-500/30 text-foreground px-6 py-3 rounded-full shadow-2xl shadow-emerald-500/20 flex items-center gap-3 font-semibold text-sm"
            >
              <span className="text-xl animate-bounce">{getEmoji(msg.type)}</span>
              <span>{msg.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SuccessContext.Provider>
  );
};
