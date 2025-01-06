-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    contact_id UUID,
    contact_type TEXT CHECK (contact_type IN ('lead', 'customer')),
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) NOT NULL,
    due_date DATE,
    notes TEXT,
    status TEXT CHECK (status IN ('open', 'in_progress', 'done')) NOT NULL DEFAULT 'open',
    position INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks"
    ON public.tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
    ON public.tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
    ON public.tasks FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX tasks_contact_idx ON public.tasks(contact_id, contact_type);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_position_idx ON public.tasks(position);