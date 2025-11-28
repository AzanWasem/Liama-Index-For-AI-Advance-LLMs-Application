import React from 'react';
import type { View } from '../types';
import { HomeIcon, ChatIcon, LiveIcon, OtherIcon, AboutIcon } from './icons/NavIcons';

interface BottomNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  view: View;
  activeView: View;
  setActiveView: (view: View) => void;
  children: React.ReactNode;
}> = ({ label, view, activeView, setActiveView, children }) => {
  const isActive = activeView === view;
  return (
    <button
      aria-label={label}
      onClick={() => setActiveView(view)}
      className={`flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ease-in-out group ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
    >
      <div className="relative">
        {children}
        {isActive && <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]"></span>}
      </div>
      <span className={`text-xs mt-1.5 font-medium transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto mb-4 z-50">
      <div className="mx-4 bg-black/60 backdrop-blur-lg border border-neutral-700/80 rounded-full shadow-lg flex justify-around items-center h-20">
        <NavItem label="Home" view="HOME" activeView={activeView} setActiveView={setActiveView}><HomeIcon /></NavItem>
        <NavItem label="Chat" view="CHAT" activeView={activeView} setActiveView={setActiveView}><ChatIcon /></NavItem>
        <NavItem label="Live" view="LIVE" activeView={activeView} setActiveView={setActiveView}><LiveIcon /></NavItem>
        <NavItem label="Edit" view="EDIT" activeView={activeView} setActiveView={setActiveView}><OtherIcon /></NavItem>
        <NavItem label="About" view="ABOUT" activeView={activeView} setActiveView={setActiveView}><AboutIcon /></NavItem>
      </div>
    </nav>
  );
};

export default BottomNav;