import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card as CardType, Connection } from '../types';

interface WhiteboardProps {
  cards: CardType[];
  connections: Connection[];
  onCardUpdate: (card: CardType) => void;
  onCardSelect: (card: CardType) => void;
  onConnect: (fromId: string, toId: string) => void;
  selectedCardId: string | null;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ 
    cards, 
    connections, 
    onCardUpdate, 
    onCardSelect, 
    onConnect,
    selectedCardId 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Pan and Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Navigation State
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Connection State
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent, card: CardType) => {
    e.stopPropagation();

    // If we are in "Connecting Mode" (clicked link button on another card)
    if (connectingFromId) {
        onConnect(connectingFromId, card.id);
        setConnectingFromId(null);
        return;
    }

    setActiveDragId(card.id);
    setIsDragging(true);
    // Adjust drag offset based on scale
    setDragOffset({
      x: (e.clientX - pan.x) / scale - card.x,
      y: (e.clientY - pan.y) / scale - card.y
    });
    onCardSelect(card);
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    setConnectingFromId(null); // Cancel connection if clicking background
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && activeDragId) {
      const card = cards.find(c => c.id === activeDragId);
      if (card) {
        onCardUpdate({
          ...card,
          x: (e.clientX - pan.x) / scale - dragOffset.x,
          y: (e.clientY - pan.y) / scale - dragOffset.y
        });
      }
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveDragId(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // If Ctrl is pressed, it's a zoom
    if (e.ctrlKey || e.metaKey) {
        // Prevent default browser zoom
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(scale + delta, 0.1), 4);
        setScale(newScale);
    } else {
        // Otherwise it's a pan (scroll)
        setPan(prev => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY
        }));
    }
  };

  // Zoom helpers
  const zoomIn = () => setScale(s => Math.min(s + 0.1, 4));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.1));

  // Navigation Functions
  const centerCard = (card: CardType) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    
    // Calculate new pan to center the card accounting for scale
    // viewport_center = pan + (card_pos * scale)
    const cardCenterX = (card.x + card.width / 2) * scale;
    const cardCenterY = (card.y + card.height / 2) * scale;
    
    setPan({ 
        x: (clientWidth / 2) - cardCenterX,
        y: (clientHeight / 2) - cardCenterY
    });
    onCardSelect(card);
  };

  const navigateSequential = (direction: 'next' | 'prev') => {
    if (cards.length === 0) return;

    let nextIndex = 0;
    const currentIndex = cards.findIndex(c => c.id === selectedCardId);

    if (currentIndex === -1) {
        // If no card selected, Next goes to first, Prev goes to last
        nextIndex = direction === 'next' ? 0 : cards.length - 1;
    } else {
        nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    }

    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= cards.length) nextIndex = cards.length - 1;

    centerCard(cards[nextIndex]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigateSequential('next');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigateSequential('prev');
      if (e.key === 'Escape') setConnectingFromId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cards, selectedCardId, scale]);

  // Infinite desk background pattern
  const backgroundStyle = {
    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    width: '100%',
    height: '100%',
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
  };

  // Connection drawing logic (Bezier curves)
  const getPath = (c1: CardType, c2: CardType) => {
      const isVertical = Math.abs(c1.x - c2.x) < c1.width / 2 && c2.y > c1.y;

      if (isVertical) {
          const start = { x: c1.x + c1.width/2, y: c1.y + c1.height };
          const end = { x: c2.x + c2.width/2, y: c2.y };
          const dist = end.y - start.y;
          const curvature = Math.min(dist * 0.5, 100);
          return `M ${start.x} ${start.y} C ${start.x} ${start.y + curvature}, ${end.x} ${end.y - curvature}, ${end.x} ${end.y}`;
      } else {
          const start = { x: c1.x + c1.width, y: c1.y + c1.height/2 };
          const end = { x: c2.x, y: c2.y + c2.height/2 };
          const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          const curvature = Math.min(dist * 0.5, 300);
          return `M ${start.x} ${start.y} C ${start.x + curvature} ${start.y}, ${end.x - curvature} ${end.y}, ${end.x} ${end.y}`;
      }
  };

  // Determine current index for disabled logic
  const currentIndex = selectedCardId ? cards.findIndex(c => c.id === selectedCardId) : -1;

  return (
    <div 
      className="relative w-full h-full bg-slate-50 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={handleBackgroundMouseDown}
      onWheel={handleWheel}
      ref={containerRef}
    >
      {/* Container that handles Pan and Scale */}
      <div 
        style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute'
        }}
      >
          <div style={backgroundStyle} className="opacity-50" />

          {/* SVG Connection Layer */}
          <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible z-0">
             <defs>
                 <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                     <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                 </marker>
             </defs>
             {connections.map(conn => {
                 const c1 = cards.find(c => c.id === conn.fromCardId);
                 const c2 = cards.find(c => c.id === conn.toCardId);
                 if (!c1 || !c2) return null;
                 return (
                     <path 
                        key={conn.id}
                        d={getPath(c1, c2)}
                        stroke="#94a3b8"
                        strokeWidth="2"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                        opacity="0.6"
                     />
                 )
             })}
          </svg>

          {/* Cards Layer */}
          {cards.map(card => (
            <div
              key={card.id}
              onMouseDown={(e) => handleMouseDown(e, card)}
              className={`absolute pointer-events-auto flex flex-col rounded-lg shadow-sm border transition-shadow duration-200 z-10
                ${selectedCardId === card.id ? 'ring-2 ring-indigo-500 shadow-xl' : 'border-slate-200 shadow hover:shadow-md'}
                ${connectingFromId === card.id ? 'ring-2 ring-dashed ring-indigo-400' : ''}
              `}
              style={{
                left: card.x,
                top: card.y,
                width: card.width,
                height: card.height,
                backgroundColor: card.color,
              }}
            >
              <div className="h-8 border-b border-black/5 flex items-center px-3 cursor-move bg-black/5 rounded-t-lg group">
                <span className="text-xs font-semibold text-slate-700 truncate select-none flex-1">{card.title}</span>
                
                {/* Connection Button */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setConnectingFromId(card.id);
                    }}
                    className={`ml-2 p-1 rounded hover:bg-black/10 text-slate-400 hover:text-indigo-600 transition-colors ${connectingFromId === card.id ? 'text-indigo-600 bg-indigo-50' : ''}`}
                    title="Link to another card"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </button>

                <div className="ml-1 w-2 h-2 rounded-full bg-red-400 opacity-0 group-hover:opacity-50"></div>
              </div>
              <div 
                className="flex-1 p-4 overflow-y-auto text-sm text-slate-800 leading-relaxed font-serif select-text cursor-text markdown-content" 
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {card.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col gap-2">
         {/* Zoom Controls */}
         <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow flex flex-col overflow-hidden">
             <button onClick={zoomIn} className="p-2 hover:bg-slate-50 text-slate-600 border-b border-slate-100" title="Zoom In">+</button>
             <button onClick={zoomOut} className="p-2 hover:bg-slate-50 text-slate-600" title="Zoom Out">-</button>
         </div>
         
         <div className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded-lg shadow text-xs text-slate-500 hidden sm:block">
            <p>Pan: Hold Click + Drag BG <span className="text-slate-400">or use Scroll</span></p>
            <p>Zoom: Ctrl + Scroll</p>
            <p>Link: Click <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> then click target</p>
         </div>
      </div>

      {/* Linking Mode Indicator */}
      {connectingFromId && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-medium animate-bounce">
              Select a card to connect... (Esc to cancel)
          </div>
      )}

      {/* Navigation Toggle */}
      <button 
         className="absolute top-4 left-4 z-20 bg-white p-2 rounded-lg shadow border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
         onClick={() => setIsNavOpen(true)}
         title="Table of Contents"
       >
         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
         </svg>
       </button>

       {/* Navigation Drawer */}
       {isNavOpen && (
         <div className="absolute top-0 left-0 h-full w-72 bg-white shadow-2xl z-40 border-r border-slate-200 flex flex-col animate-slide-right">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <span className="font-semibold text-slate-800">Content Map</span>
               <button onClick={() => setIsNavOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
               {cards.map((card, idx) => (
                 <button 
                   key={card.id} 
                   onClick={() => centerCard(card)}
                   className={`w-full text-left px-3 py-3 text-sm rounded-lg transition-colors flex gap-3 group
                     ${selectedCardId === card.id ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}
                   `}
                 >
                   <span className={`font-mono text-xs mt-0.5 ${selectedCardId === card.id ? 'text-indigo-400' : 'text-slate-400'}`}>{String(idx + 1).padStart(2, '0')}</span>
                   <span className="truncate font-medium">{card.title}</span>
                 </button>
               ))}
            </div>
         </div>
       )}

       {/* Overlay for Drawer */}
       {isNavOpen && (
         <div className="absolute inset-0 bg-black/10 z-30" onClick={() => setIsNavOpen(false)}></div>
       )}

       {/* Bottom Navigation Control */}
       <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center shadow-lg rounded-full bg-white border border-slate-200 p-1 pointer-events-auto">
            <button 
                onClick={() => navigateSequential('prev')} 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                disabled={cards.length === 0 || currentIndex === 0}
                title="Previous Card"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            
            <div className="px-4 text-sm font-medium text-slate-600 border-l border-r border-slate-100 mx-1 min-w-[80px] text-center">
                 {currentIndex !== -1 ? (
                     <span>
                         Card {currentIndex + 1} <span className="text-slate-400">/</span> {cards.length}
                     </span>
                 ) : (
                     <span className="text-slate-400">Total Cards: {cards.length}</span>
                 )}
            </div>

            <button 
                onClick={() => navigateSequential('next')} 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                disabled={cards.length === 0 || currentIndex === cards.length - 1}
                title="Next Card"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
       </div>

    </div>
  );
};

export default Whiteboard;