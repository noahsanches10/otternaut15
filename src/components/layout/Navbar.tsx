import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Users, UserCheck, CheckSquare, BarChartBig, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/customers', icon: UserCheck, label: 'Customers' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/analytics', icon: BarChartBig, label: 'Analytics' }
];

interface NavbarProps {
  isCollapsed: boolean;
  isMobileNavOpen: boolean;
  isAnimating: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onMobileNavClose: () => void;
  onTransitionEnd: () => void;
}

export function Navbar({ 
  isCollapsed, 
  isMobileNavOpen, 
  isAnimating,
  onToggleCollapse, 
  onMobileNavClose,
  onTransitionEnd 
}: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {isMobileNavOpen && (
        <div 
          className={cn(
            "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden",
            isAnimating ? "animate-in fade-in-0" : "animate-out fade-out-0"
          )}
          onClick={onMobileNavClose}
        />
      )}
      <nav 
        className={cn(
          "fixed top-0 left-0 h-screen bg-card border-r border-border p-3",
          "transition-all duration-300 ease-in-out",
          "z-50",
          "lg:translate-x-0",
          "md:w-64 sm:w-64",
          !isMobileNavOpen && "-translate-x-full lg:translate-x-0",
          isCollapsed ? "lg:w-16" : "lg:w-40"
        )}
        onTransitionEnd={onTransitionEnd}
      >
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 lg:hidden hover:bg-accent/50"
          onClick={onMobileNavClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="mb-8">
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="Otternaut"
            className={cn(
              "h-8 w-auto transition-all duration-300",
              "lg:ml-1"
            )}
          />
        </div>

        <ul className="space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => {
                  return cn(
                    "flex items-center rounded-lg transition-colors text-sm",
                    isCollapsed ? "lg:justify-center" : "lg:justify-start",
                    "lg:p-2 px-3 py-2",
                    !isCollapsed && "lg:space-x-2",
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }}
                title={label}
              >
                <Icon className="w-5 h-5" />
                <span className={cn(
                  "ml-2",
                  "lg:ml-0",
                  isCollapsed ? "lg:hidden" : ""
                )}>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className={cn(
          "absolute bottom-4 space-y-4",
          "left-4 right-4",
          "lg:left-2 lg:right-2"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleCollapse(!isCollapsed)}
            className="w-full hidden lg:flex"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </nav>
    </>
  );
}