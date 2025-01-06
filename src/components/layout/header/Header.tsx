import React from 'react';
import { ActivityCenter } from './ActivityCenter';
import { Sparkles } from 'lucide-react';
import { HelpCenter } from './HelpCenter';
import { UserMenu } from './UserMenu';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/button';
import { AIChat } from '../../ai/AIChat';
import { cn } from '../../../lib/utils';
import { Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { UserProfile } from '../../../types/supabase';

const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case '/':
      return 'Home';
    case '/leads':
      return 'Leads';
    case '/customers':
      return 'Customers';
    case '/analytics':
      return 'Analytics';
    case '/tasks':
      return 'Tasks';
    case '/profile':
      return 'Profile';
    case '/integrations':
      return 'Integrations';
    default:
      return '';
  }
};

interface HeaderProps {
  isNavCollapsed: boolean;
  isMobileNavOpen: boolean;
  onMobileNavToggle: () => void;
}

export function Header({ isNavCollapsed, isMobileNavOpen, onMobileNavToggle }: HeaderProps) {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const { session } = useAuth();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  return (
    <header className={cn(
      "fixed top-0 right-0 z-50 h-14",
      "bg-background",
      "transition-all duration-300",
      "left-0 right-0",
      isNavCollapsed ? "lg:left-16" : "lg:left-40"
    )}>
      <div className="h-full px-4 w-full flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileNavToggle}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="hidden md:inline text-sm text-muted-foreground">{profile?.company_name || 'Otternaut'}</span>
          <div className="flex items-center space-x-4">
            <div className="hidden md:block h-4 w-px bg-border" />
            <span className="text-sm font-medium">{pageTitle}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 md:space-x-2">
          <Button
            variant="ghost"
            size="icon"
            title="AI Assistant"
            onClick={() => setIsAIChatOpen(true)}
            className="h-9 w-9 rounded-full"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <ActivityCenter />
          <HelpCenter className="hidden md:flex" />
          <UserMenu />
        </div>
      </div>
      <AIChat isOpen={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
    </header>
  );
}