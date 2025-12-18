
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, glow = false }) => {
  return (
    <div className={`bg-darkgrey-800 rounded-2xl border ${glow ? 'border-blood-500/30 shadow-glow' : 'border-white/5'} overflow-hidden transition-all duration-500 ${className}`}>
      {title && (
        <div className="px-6 py-5 border-b border-white/5 bg-white/2">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};
