import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Card } from '../types';
import { generateAIResponse } from '../services/geminiService';

interface ChatSidebarProps {
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeCard: Card | null;
  allCards: Card[];
  onAddCard: (title: string, content: string, type: 'ai-response') => void;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ history, setHistory, activeCard, allCards, onAddCard, onClose }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
    };

    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Context strategy: If a card is selected, prioritize it. Otherwise use all cards summary.
    let context = "";
    if (activeCard) {
      context = `FOCUS ON THIS CARD: "${activeCard.title}"\nCONTENT:\n${activeCard.content}`;
    } else {
      context = `FULL WHITEBOARD CONTENT:\n` + allCards.map(c => `[Card: ${c.title}]\n${c.content.substring(0, 500)}...`).join('\n\n');
    }

    try {
      const responseText = await generateAIResponse(history, context, userMsg.text, useThinking);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        isThinking: useThinking
      };

      setHistory(prev => [...prev, aiMsg]);
    } catch (e) {
      // Error handled in service, but we need to unlock UI
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragToWhiteboard = (msg: ChatMessage) => {
    onAddCard("AI Insight", msg.text, 'ai-response');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl w-96 z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          AI Tutor
        </h2>
        <div className="flex items-center gap-2">
            <label className="text-xs flex items-center gap-1 cursor-pointer select-none text-slate-600">
                <input 
                    type="checkbox" 
                    checked={useThinking} 
                    onChange={(e) => setUseThinking(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Thinking Mode
            </label>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2" title="Close AI Tutor">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      </div>

      {/* Context Indicator */}
      {activeCard && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-xs text-yellow-800 flex items-center justify-between">
          <span className="truncate max-w-[200px]">Focus: {activeCard.title}</span>
          <button className="text-yellow-600 hover:text-yellow-900 font-bold" onClick={() => {}}>×</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {history.length === 0 && (
            <div className="text-center text-slate-400 mt-10 text-sm p-4">
                <p>Ask me to summarize, explain specific concepts, or critique your understanding.</p>
                <div className="mt-4 space-y-2">
                    <button onClick={() => setInput("Summarize the selected card focusing on the main mental structure.")} className="block w-full text-left p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 text-xs">Summarize Structure</button>
                    <button onClick={() => setInput("Explain this concept like I'm 5 years old.")} className="block w-full text-left p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 text-xs">ELI5 Explanation</button>
                    <button onClick={() => setInput("Create a quiz based on this content to test my knowledge.")} className="block w-full text-left p-2 bg-white rounded border border-slate-200 hover:bg-slate-50 text-xs">Quiz Me</button>
                </div>
            </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[90%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }
              `}
            >
              {msg.isThinking && <div className="text-xs text-indigo-400 mb-1 font-semibold tracking-wider">THOUGHT PROCESS ANALYZED</div>}
              {msg.text}
            </div>
            {msg.role === 'model' && (
              <button 
                onClick={() => handleDragToWhiteboard(msg)}
                className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                + Add to Board
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm ml-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
            {useThinking && <span className="text-xs ml-2 animate-pulse">Deep thinking...</span>}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder="Ask about your learning materials..."
            className="flex-1 resize-none h-10 max-h-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;