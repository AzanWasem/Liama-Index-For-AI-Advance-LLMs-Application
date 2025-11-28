import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Home from './views/Home';
import AIChat from './views/AIChat';
import Live from './views/Live';
import Other from './views/Other';
import About from './views/About';
import type { View } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('HOME');
  const [viewKey, setViewKey] = useState(0);

  useEffect(() => {
    setViewKey(prevKey => prevKey + 1);
  }, [activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'HOME':
        return <Home />;
      case 'CHAT':
        return <AIChat />;
      case 'LIVE':
        return <Live />;
      case 'EDIT':
        return <Other />;
      case 'ABOUT':
        return <About />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="font-sf-pro bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-gradient-to-b from-[#050505] via-black to-black" />
      <main className="w-full max-w-lg h-full flex-grow pb-28 pt-8 px-4 overflow-y-auto">
         <div key={viewKey} className="animate-slide-up-fade-in">
          {renderView()}
        </div>
      </main>
      <BottomNav activeView={activeView} setActiveView={setActiveView} />
    </div>
  );
};

export default App;