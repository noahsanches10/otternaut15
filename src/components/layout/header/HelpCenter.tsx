import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';

interface HelpCenterProps {
  className?: string;
}

export function HelpCenter({ className }: HelpCenterProps) {
  return (
    <DropdownMenu> 
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-9 w-9 rounded-full", className)}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem>
          Documentation
        </DropdownMenuItem>
        <DropdownMenuItem>
          Video Tutorials
        </DropdownMenuItem>
        <DropdownMenuItem>
          Keyboard Shortcuts
        </DropdownMenuItem>
        <DropdownMenuItem>
          Contact Support
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}