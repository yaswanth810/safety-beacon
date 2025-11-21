-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('user', 'moderator', 'admin');

-- Create incident_type enum
CREATE TYPE public.incident_type AS ENUM (
  'harassment',
  'assault',
  'stalking',
  'domestic_violence',
  'cyber_harassment',
  'workplace_harassment',
  'other'
);

-- Create incident_status enum
CREATE TYPE public.incident_status AS ENUM ('new', 'under_review', 'resolved');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  incident_type incident_type NOT NULL,
  description TEXT NOT NULL,
  location_address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_anonymous BOOLEAN DEFAULT FALSE,
  status incident_status DEFAULT 'new',
  evidence_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create sos_alerts table
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Create forum_posts table
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- Create forum_comments table
CREATE TABLE public.forum_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Create legal_resources table
CREATE TABLE public.legal_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.legal_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for incidents
CREATE POLICY "Users can view own incidents or all if admin/moderator"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    is_anonymous OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Authenticated users can create incidents"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_anonymous = true);

CREATE POLICY "Users can update own incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins and moderators can update any incident"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'moderator')
  );

-- RLS Policies for sos_alerts
CREATE POLICY "Users can view own SOS alerts"
  ON public.sos_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all SOS alerts"
  ON public.sos_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own SOS alerts"
  ON public.sos_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own SOS alerts"
  ON public.sos_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for forum_posts
CREATE POLICY "Anyone can view forum posts"
  ON public.forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON public.forum_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON public.forum_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for forum_comments
CREATE POLICY "Anyone can view comments"
  ON public.forum_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.forum_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON public.forum_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON public.forum_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for legal_resources
CREATE POLICY "Anyone can view legal resources"
  ON public.legal_resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage legal resources"
  ON public.legal_resources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial legal resources
INSERT INTO public.legal_resources (category, title, content) VALUES
('Rights', 'Your Legal Rights', 'Every woman has the right to live free from violence, harassment, and discrimination. You have the right to report incidents to law enforcement, seek protective orders, and access support services without fear of retaliation.'),
('Rights', 'Right to Safety at Work', 'Workplace harassment is illegal. You have the right to a safe work environment free from sexual harassment, discrimination, and hostile work conditions. Employers are legally required to address complaints and take preventive measures.'),
('Procedures', 'How to File a Police Complaint', 'To file a complaint: 1) Visit your local police station or call emergency services, 2) Provide detailed information about the incident, 3) Request a copy of the First Information Report (FIR), 4) Keep all evidence and documentation, 5) Follow up regularly on your case status.'),
('Procedures', 'Obtaining a Restraining Order', 'A restraining order (protection order) legally prevents an abuser from contacting or approaching you. Steps: 1) File a petition at family court, 2) Provide evidence of threats or violence, 3) Attend the hearing, 4) If granted, the order is enforceable by law enforcement.'),
('Legal Actions', 'Civil vs Criminal Cases', 'Criminal cases involve prosecution by the state for offenses like assault, while civil cases are personal lawsuits for damages. You can pursue both simultaneously. Criminal cases may result in imprisonment, while civil cases can award monetary compensation.'),
('Legal Actions', 'Seeking Legal Aid', 'Free legal aid is available through: 1) National Legal Services Authority, 2) State Legal Services Authority, 3) District Legal Services Authority, 4) NGOs and women''s organizations. Eligibility includes income criteria and case type.'),
('Domestic Violence', 'Protection from Domestic Violence', 'The Protection of Women from Domestic Violence Act provides comprehensive protection including: 1) Protection orders, 2) Residence orders, 3) Monetary relief, 4) Custody orders, 5) Compensation orders. Contact local protection officer for assistance.'),
('Domestic Violence', 'Emergency Support Services', 'In case of domestic violence: 1) Call emergency helpline (national/state numbers), 2) Contact nearest shelter home, 3) Seek medical attention and document injuries, 4) File a police complaint, 5) Contact legal aid services for guidance.'),
('Workplace Harassment', 'Sexual Harassment at Workplace', 'The Sexual Harassment of Women at Workplace Act mandates: 1) Internal Complaints Committee at workplaces, 2) Strict timelines for inquiry, 3) Protection against retaliation, 4) Penalties for employers who fail to comply. File complaint within 3 months of incident.'),
('Cyberstalking', 'Online Harassment and Cybercrime', 'Cyberstalking and online harassment are punishable under IT Act. Steps to take: 1) Document all evidence (screenshots, messages), 2) Block the harasser, 3) Report to social media platform, 4) File complaint with Cyber Crime Cell, 5) Consider legal action for defamation or threats.');

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;