import React from 'react';
import GlassCard from '../components/GlassCard';

const Home: React.FC = () => {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tighter text-neutral-50">
          MindCore
        </h1>
        <p className="text-neutral-400 mt-2 text-lg">Your Unified AI Command Center.</p>
      </header>
      
      <section className="space-y-4">
        <GlassCard className="p-6 text-center" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-semibold text-neutral-100">
            Welcome to the Future
          </h2>
          <p className="text-neutral-300 mt-2">
            Seamlessly switch between the world's most powerful AI models. Chat, create, and innovate all in one place.
          </p>
        </GlassCard>

        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 flex flex-col items-center justify-center text-center" style={{ animationDelay: '0.2s' }}>
             <span className="text-3xl mb-2">💬</span>
             <h3 className="font-semibold">Unified Chat</h3>
             <p className="text-xs text-neutral-400">All models, one chat.</p>
          </GlassCard>
           <GlassCard className="p-4 flex flex-col items-center justify-center text-center" style={{ animationDelay: '0.3s' }}>
             <span className="text-3xl mb-2">🤖</span>
             <h3 className="font-semibold">AI Agents</h3>
             <p className="text-xs text-neutral-400">Specialists for any task.</p>
          </GlassCard>
           <GlassCard className="p-4 flex flex-col items-center justify-center text-center" style={{ animationDelay: '0.4s' }}>
             <span className="text-3xl mb-2">🎨</span>
             <h3 className="font-semibold">Create</h3>
             <p className="text-xs text-neutral-400">Docs, images & more.</p>
          </GlassCard>
           <GlassCard className="p-4 flex flex-col items-center justify-center text-center" style={{ animationDelay: '0.5s' }}>
             <span className="text-3xl mb-2">✨</span>
             <h3 className="font-semibold">HUD UI</h3>
             <p className="text-xs text-neutral-400">Futuristic new look.</p>
          </GlassCard>
        </div>
      </section>
    </div>
  );
};

export default Home;