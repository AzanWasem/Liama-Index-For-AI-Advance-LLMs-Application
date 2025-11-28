import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, style }) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        relative bg-neutral-800/30 backdrop-blur-sm border border-neutral-700/80 rounded-xl
        transition-all duration-300 hover:border-neutral-500/80 hover:bg-neutral-800/50
        shadow-[0_0_20px_rgba(0,0,0,0.2)]
        overflow-hidden
        ${onClick ? 'cursor-pointer' : ''} ${className}
      `}
    >
      {/* Scanline overlay */}
      <div 
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)`,
        }}
      ></div>
      
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;