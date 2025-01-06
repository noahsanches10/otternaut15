import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Header } from './header/Header';
import { Toaster } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

export function Layout() {
  const { session } = useAuth();
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState({
    isOpen: false,
    isAnimating: false,
    isClosing: false
  });

  // Auto-collapse nav on mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setMobileNav({ isOpen: false, isAnimating: false, isClosing: false });
        setIsNavCollapsed(true);
      } else {
        setIsNavCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobileNav = () => {
    setMobileNav(prev => ({
      isOpen: !prev.isOpen,
      isAnimating: true,
      isClosing: prev.isOpen
    }));
  };

  const closeMobileNav = () => {
    setMobileNav({
      isOpen: false,
      isAnimating: true,
      isClosing: true
    });
  };

  const handleTransitionEnd = () => {
    setMobileNav(prev => ({
      ...prev,
      isAnimating: false,
      isClosing: false
    }));
  };

  if (!session) return null;

  return (
    <div className={cn(
      "min-h-screen",
      "bg-background text-foreground",
      mobileNav.isOpen && !mobileNav.isClosing && "overflow-hidden lg:overflow-auto"
    )}>
      <Header 
        isNavCollapsed={isNavCollapsed}
        isMobileNavOpen={mobileNav.isOpen}
        onMobileNavToggle={toggleMobileNav}
      />
      <Navbar 
        isCollapsed={isNavCollapsed}
        isMobileNavOpen={mobileNav.isOpen}
        isAnimating={mobileNav.isAnimating}
        onToggleCollapse={setIsNavCollapsed}
        onMobileNavClose={closeMobileNav}
        onTransitionEnd={handleTransitionEnd}
      />
      <main className={cn( 
        "px-8 py-4 transition-all duration-300",
        "lg:px-8 md:px-6 sm:px-4",
        isNavCollapsed ? "lg:ml-16" : "lg:ml-40",
        "md:ml-0 sm:ml-0",
        "mt-14" // Reduced top margin for header
      )}>
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        containerStyle={{
          top: 24,
          right: 24,
        }}
        toastOptions={{
          style: {
            background: 'transparent',
            boxShadow: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
          },
        }}
      />
    </div>
  );
}