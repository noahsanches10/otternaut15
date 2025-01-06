import React, { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: string;
    type: 'lead' | 'customer';
    name: string;
    email?: string;
    phone?: string;
  };
}

export function ContactDialog({ isOpen, onClose, recipient }: ContactDialogProps) {
  const [channel, setChannel] = useState<'email' | 'sms'>('sms');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (channel === 'email' && !subject?.trim()) {
      toast.error('Please enter a subject line');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (channel === 'email' && !recipient?.email) {
      toast.error('Cannot send email - recipient has no email address');
      return;
    }

    if (channel === 'sms' && !recipient?.phone) {
      toast.error('Cannot send SMS - recipient has no phone number');
      return;
    }

    setIsSending(true);

    try {
      const messageData = {
        contactId: recipient.id,
        contactType: recipient.type,
        channel,
        content: message.trim(),
        subject: channel === 'email' ? subject.trim() : undefined
      };

      await sendMessage({
        ...messageData
      });

      toast.success('Message sent successfully');
      setMessage('');
      setSubject('');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "!fixed !right-0 !left-auto !translate-x-0",
        "!h-screen !max-h-screen !rounded-none",
        "w-full sm:w-[440px] overflow-hidden"
      )}>
        <div className="flex flex-col h-full max-h-screen">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle>Contact {recipient.name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <Tabs value={channel} onValueChange={(value: 'email' | 'sms') => setChannel(value)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" disabled={!recipient.email}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email {!recipient.email && '(No Email)'}
                </TabsTrigger>
                <TabsTrigger value="sms" disabled={!recipient.phone}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS {!recipient.phone && '(No Phone)'}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {channel === 'email' && (
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line..."
                    className="mt-1.5"
                  />
                </div>
              )}
              <div>
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="mt-1.5"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}