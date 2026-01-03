import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'strong';
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const variants = {
    default: 'glass',
    subtle: 'glass-subtle',
    strong: 'glass-strong',
  };

  return (
    <div
      className={cn(
        variants[variant],
        'rounded-2xl p-4 transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
