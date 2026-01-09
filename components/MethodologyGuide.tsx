import React from 'react';

const MethodologyGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-800">The "Deep Learning" Methodology</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 space-y-6 text-slate-700">
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Parse the Source</h3>
              <p className="text-sm mt-1">Don't rely on AI summaries alone. Upload the full text (e.g., a textbook chapter). We put the raw content on the whiteboard so the AI has the full context.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Create Materials (The "Infinite Desk")</h3>
              <p className="text-sm mt-1">We split the content into cards (chapters/sections) laid out left-to-right. This allows you to see the "whole picture" at once, unlike a single page view.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Read & Discuss</h3>
              <p className="text-sm mt-1">Read the cards. Stuck? Select a card and ask the AI Tutor. Use "Thinking Mode" for complex abstract questions. Drag helpful AI answers onto the board as new cards.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">4</div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900">Synthesize Notes</h3>
              <p className="text-sm mt-1">Don't just copy. Rewrite what you learned in your own words in the Note Editor. This forces your brain to fill in logical gaps.</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
            <strong>Pro Tip:</strong> Use the "Thinking Mode" checkbox in the chat for the Gemini 3 Pro model when dealing with dense academic text. It has a larger reasoning budget.
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Got it, let's learn</button>
        </div>
      </div>
    </div>
  );
};

export default MethodologyGuide;