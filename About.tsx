import React from 'react';
import GlassCard from '../components/GlassCard';

const StatCard: React.FC<{ value: string; label: string; delay: string }> = ({ value, label, delay }) => (
  <GlassCard className="p-4 text-center" style={{ animationDelay: delay }}>
    <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-neutral-100 to-neutral-300">{value}</p>
    <p className="text-sm text-neutral-500">{label}</p>
  </GlassCard>
);

const About: React.FC = () => {
  return (
    <div className="space-y-6 pb-8">
      <header className="text-center">
        <div className="inline-block p-1 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full mb-4">
          <img src="https://picsum.photos/seed/azan/100/100" alt="Azan Waseem" className="w-24 h-24 rounded-full border-4 border-black" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-100">Azan Waseem</h1>
        <p className="text-neutral-400">Creator of MindCore</p>
      </header>

      <GlassCard className="p-6">
        <h2 className="font-semibold text-xl mb-2 text-neutral-100">My Vision</h2>
        <p className="text-neutral-300">
          I’m Azan Waseem, a visionary creator, data scientist, and editor passionate about merging human creativity with artificial intelligence. Over the years, I’ve explored how technology can empower people to achieve more, and MindCore is the culmination of that vision.
        </p>
      </GlassCard>
      
      <GlassCard className="p-6">
        <h2 className="font-semibold text-xl mb-2 text-neutral-100">Philosophy</h2>
        <p className="text-neutral-300 italic">"Discipline creates freedom. Focus builds greatness."</p>
        <p className="text-neutral-300 mt-2">
            This principle guides my work. By building focused, disciplined tools like MindCore, I aim to provide the freedom for anyone to create and innovate without limits.
        </p>
      </GlassCard>
      
      <div className="grid grid-cols-3 gap-3">
          <StatCard value="7+" label="AI Models" delay="0.1s" />
          <StatCard value="∞" label="Possibilities" delay="0.2s" />
          <StatCard value="1" label="Vision" delay="0.3s" />
      </div>

      <div className="text-center pt-4">
        <p className="text-neutral-400 mb-4">Connect with me</p>
        <div className="flex justify-center space-x-4">
          <a href="#" className="w-12 h-12 bg-neutral-800/80 rounded-full flex items-center justify-center text-neutral-300 hover:bg-neutral-700/90 transition-colors">X</a>
          <a href="#" className="w-12 h-12 bg-neutral-800/80 rounded-full flex items-center justify-center text-neutral-300 hover:bg-neutral-700/90 transition-colors">Git</a>
          <a href="#" className="w-12 h-12 bg-neutral-800/80 rounded-full flex items-center justify-center text-neutral-300 hover:bg-neutral-700/90 transition-colors">Web</a>
        </div>
      </div>
    </div>
  );
};

export default About;