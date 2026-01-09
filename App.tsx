import React, { useState, useEffect, useRef } from 'react';
import Whiteboard from './components/Whiteboard';
import ChatSidebar from './components/ChatSidebar';
import MethodologyGuide from './components/MethodologyGuide';
import { Card, Connection, ChatMessage, MethodologyStep } from './types';
import { suggestSplitPoints, translateContent } from './services/geminiService';
import { extractTextFromPdf } from './services/pdfUtils';
import { parseMarkdownFile } from './services/markdownUtils';

// Sample data from the PDF "Pattern Recognition" example
const SAMPLE_TEXT = `1.2.6 Bayesian curve fitting
Although the maximum likelihood method allows us to find the best values for the parameters w, and the bootstrap method gives us an estimation of the variability of those parameter values, they are still just point estimates.
In a full Bayesian approach, we should consistently apply the sum and product rules of probability, which as we shall see shortly, implies that we integrate over all values of w. Such marginalizations lie at the heart of Bayesian methods for pattern recognition.
In the curve fitting problem, we are given the training data X and t, along with a new test point x, and our goal is to predict the value of t. We therefore wish to evaluate the predictive distribution p(t|x, X, t).
Assuming that the parameters alpha and beta are fixed and known in advance, the probability of t is given by...
[...Mathematical formulas would be here...]
`;

const SUPPORTED_LANGUAGES = [
  { code: 'Original', label: 'Original Language' },
  { code: 'Ukrainian', label: 'Ukrainian (Українська)' },
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'German', label: 'German' },
  { code: 'French', label: 'French' },
];

const App: React.FC = () => {
  const [step, setStep] = useState<MethodologyStep>(MethodologyStep.UPLOAD);
  const [cards, setCards] = useState<Card[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showGuide, setShowGuide] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [targetLanguage, setTargetLanguage] = useState<string>('Original');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout state
  const [showChat, setShowChat] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [userNotes, setUserNotes] = useState("");

  const handleProcessText = async () => {
    setIsProcessing(true);
    setProcessingStatus("Analyzing text structure...");
    
    let contentToUse = inputText;

    if (targetLanguage !== 'Original') {
        setProcessingStatus(`Translating to ${targetLanguage}...`);
        contentToUse = await translateContent(inputText, targetLanguage);
    }
    
    // Creating a single source card for manual input
    const newCards: Card[] = [
      {
        id: '1',
        title: targetLanguage !== 'Original' ? `Source Material (${targetLanguage})` : 'Source Material',
        content: contentToUse,
        x: 100,
        y: 100,
        width: 450,
        height: 600,
        type: 'source',
        color: '#dcfce7' 
      }
    ];

    setTimeout(() => {
        setCards(newCards);
        setStep(MethodologyStep.ORGANIZE);
        setIsProcessing(false);
        setProcessingStatus("");
        setShowGuide(false); 
    }, 500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    
    let allNewCards: Card[] = [];
    // Start positioning.
    let currentXPosition = 100;
    const CARD_WIDTH = 450;
    const CARD_HEIGHT = 600;
    const VERTICAL_GAP = 60; // Space between pages vertically
    const COLUMN_GAP = 200; // Space between file columns

    try {
        // Iterate over all selected files
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const isPdf = file.name.toLowerCase().endsWith('.pdf');
            const isMd = file.name.toLowerCase().endsWith('.md');

            if (!isPdf && !isMd) {
                console.warn(`Skipping unsupported file: ${file.name}`);
                continue;
            }

            setProcessingStatus(`Processing file ${i + 1} of ${files.length}: ${file.name}...`);

            let sections: { title: string; text: string }[] = [];

            if (isPdf) {
                const pages = await extractTextFromPdf(file);
                sections = pages.map(p => ({
                    title: `${file.name} - Page ${p.pageNumber}`,
                    text: p.text
                }));
            } else if (isMd) {
                const mdSections = await parseMarkdownFile(file);
                sections = mdSections.map(s => ({
                    title: `${file.name} - ${s.title}`,
                    text: s.content
                }));
            }
            
            let processedSections = sections;

            if (targetLanguage !== 'Original') {
                const translatedSections = [];
                for (let j = 0; j < sections.length; j++) {
                    setProcessingStatus(`File ${i + 1}/${files.length}: Translating section ${j + 1}/${sections.length}...`);
                    const translatedText = await translateContent(sections[j].text, targetLanguage);
                    translatedSections.push({ ...sections[j], text: translatedText });
                }
                processedSections = translatedSections;
            }

            // Create cards for this file arranged VERTICALLY
            const fileCards: Card[] = processedSections.map((section, idx) => {
                // Keep X constant for the file
                const cardX = currentXPosition;
                // Increment Y for each section/page
                const cardY = 100 + (idx * (CARD_HEIGHT + VERTICAL_GAP));

                return {
                    id: `file-${i}-section-${idx}-${Date.now()}`,
                    title: `${section.title} ${targetLanguage !== 'Original' ? `(${targetLanguage})` : ''}`,
                    content: section.text,
                    x: cardX,
                    y: cardY,
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    type: 'source',
                    color: i % 2 === 0 ? '#dcfce7' : '#d1fae5' // Alternate distinct shades of green per file
                };
            });

            allNewCards = [...allNewCards, ...fileCards];
            
            // Advance the X position for the next file (create a new column)
            currentXPosition += CARD_WIDTH + COLUMN_GAP;
        }

        if (allNewCards.length === 0) {
             alert("No valid content found in the uploaded files.");
             setIsProcessing(false);
             return;
        }

        setCards(allNewCards);

        // Generate sequential connections
        // We connect all cards in order to show the reading flow
        const newConnections: Connection[] = [];
        for(let i=0; i<allNewCards.length - 1; i++) {
            newConnections.push({
                id: `conn-auto-${i}`,
                fromCardId: allNewCards[i].id,
                toCardId: allNewCards[i+1].id
            });
        }
        setConnections(newConnections);

        setStep(MethodologyStep.ORGANIZE);
        setShowGuide(false);
        setInputText(""); // Clear manual input

    } catch (error) {
        console.error(error);
        alert("Error reading files. Please check console for details.");
    } finally {
        setIsProcessing(false);
        setProcessingStatus("");
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddCard = (title: string, content: string, type: 'ai-response') => {
    const lastCard = cards[cards.length - 1];
    // Place new AI card to the right of the last content card
    const newX = lastCard ? lastCard.x + lastCard.width + 100 : 600;
    const newY = lastCard ? lastCard.y : 400;

    const newCard: Card = {
      id: Date.now().toString(),
      title,
      content,
      x: newX,
      y: newY,
      width: 350,
      height: 400,
      type,
      color: '#e0e7ff' // Blue-ish for AI
    };
    setCards(prev => [...prev, newCard]);
  };

  const handleCreateConnection = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    // Check if exists
    if (connections.some(c => c.fromCardId === fromId && c.toCardId === toId)) return;
    
    const newConn: Connection = {
        id: `conn-${Date.now()}`,
        fromCardId: fromId,
        toCardId: toId
    };
    setConnections(prev => [...prev, newConn]);
  };

  const activeCard = cards.find(c => c.id === selectedCardId) || null;

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden relative">
      {/* Introduction Modal */}
      {showGuide && <MethodologyGuide onClose={() => setShowGuide(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">H</div>
            <h1 className="font-semibold text-slate-700">HeptaLearn AI</h1>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 font-medium">Demo</span>
          </div>
          
          {step === MethodologyStep.UPLOAD && (
             <div className="text-sm text-slate-500">Step 1: Upload Source Material</div>
          )}
           {step !== MethodologyStep.UPLOAD && (
             <div className="flex gap-2">
               <button 
                onClick={() => setShowChat(!showChat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${showChat ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
               >
                 AI Tutor
               </button>
               <button 
                onClick={() => setShowNotes(!showNotes)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${showNotes ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
               >
                 My Notes
               </button>
             </div>
          )}
        </div>

        {/* View Switcher */}
        {step === MethodologyStep.UPLOAD ? (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Start a Deep Learning Session</h2>
                    <p className="text-slate-500 mb-6">Upload PDF or Markdown files (supports multiple files) or paste text to begin.</p>
                    
                    {/* Language Selector */}
                    <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Import Language:</span>
                        <select 
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                        >
                            {SUPPORTED_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload Area */}
                    <div 
                        className="border-2 border-dashed border-slate-300 rounded-lg p-8 mb-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-colors group"
                        onClick={() => !isProcessing && fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            multiple
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept=".pdf,.md" 
                            className="hidden" 
                        />
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <p className="font-medium text-slate-700">Click to Upload Files (PDF / MD)</p>
                        <p className="text-sm text-slate-400 mt-1">Select one or multiple files at once</p>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or paste text</span></div>
                    </div>

                    <textarea 
                        className="w-full h-32 p-4 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste raw text here..."
                    />

                    <div className="flex justify-between items-center mt-auto">
                        <button 
                            onClick={() => setShowGuide(true)}
                            className="text-indigo-600 text-sm font-medium hover:underline"
                        >
                            How does this work?
                        </button>
                        <button 
                            onClick={handleProcessText}
                            disabled={isProcessing || !inputText.trim()}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold shadow hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    {processingStatus || 'Processing...'}
                                </span>
                            ) : (
                                <>
                                    {targetLanguage !== 'Original' ? 'Translate & Import' : 'Use Text'}
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex-1 relative overflow-hidden flex">
                <Whiteboard 
                    cards={cards} 
                    connections={connections}
                    onCardUpdate={(updated) => setCards(cards.map(c => c.id === updated.id ? updated : c))}
                    onCardSelect={(card) => {
                        setSelectedCardId(card.id);
                        if (!showChat) setShowChat(true); 
                    }}
                    onConnect={handleCreateConnection}
                    selectedCardId={selectedCardId}
                />
            </div>
        )}
      </div>

      {/* Right Panels (Chat & Notes) */}
      {step !== MethodologyStep.UPLOAD && (
        <>
            {/* Notes Panel - Slide over */}
            {showNotes && (
                <div className="w-96 bg-amber-50 border-l border-amber-200 shadow-xl z-30 flex flex-col h-full absolute right-0 top-14 bottom-0">
                    <div className="p-4 border-b border-amber-200 flex justify-between items-center bg-amber-100/50">
                        <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            My Synthesis
                        </h2>
                        <button onClick={() => setShowNotes(false)} className="text-amber-700 hover:text-amber-900">×</button>
                    </div>
                    <textarea 
                        className="flex-1 bg-transparent p-6 outline-none resize-none text-slate-800 text-base leading-relaxed font-serif"
                        placeholder="Step 4: Rewrite what you learned in your own words here..."
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                    />
                </div>
            )}

            {/* Chat Sidebar */}
            {showChat && (
                <ChatSidebar 
                    history={chatHistory} 
                    setHistory={setChatHistory}
                    activeCard={activeCard}
                    allCards={cards}
                    onAddCard={handleAddCard}
                    onClose={() => setShowChat(false)}
                />
            )}
        </>
      )}
    </div>
  );
};

export default App;