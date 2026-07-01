import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import type { ChatMessage, ChatRoom, MemberProfile } from './types';

const fallbackRooms = ['General', 'Newly Diagnosed', 'Parents & Caregivers', 'College / School', 'Flares & Bad Days', 'Food / Salt Tips', 'EDS / Hypermobility', 'Local Groups'];
const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;
const inputClass = 'mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none transition focus:border-salt-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';
const buttonPrimary = 'min-h-12 rounded-xl bg-salt-700 px-4 py-3 font-bold text-white shadow-soft transition active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none dark:bg-salt-500 dark:text-slate-950 dark:disabled:bg-slate-700 dark:disabled:text-slate-400';
const buttonSecondary = 'min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 shadow-sm transition active:scale-[0.99] disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:disabled:text-slate-600';

type AuthView = 'auth' | 'forgot' | 'reset';

const textField = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const signUpRedirectUrl = () => `${window.location.origin}${window.location.pathname}`;
const recoveryRedirectUrl = () => `${window.location.origin}${window.location.pathname}?auth=recovery`;
const recoveryParams = () => {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return { search, hash };
};
const isRecoveryUrl = () => {
  const { search, hash } = recoveryParams();
  return search.get('auth') === 'recovery' || search.get('type') === 'recovery' || hash.get('type') === 'recovery';
};
const friendlySupabaseError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes('email rate limit')) {
    return 'Too many emails were sent recently. Please wait a few minutes before trying again. For production, configure custom SMTP in Supabase Auth to raise this limit.';
  }
  if (lower.includes('row-level security') && lower.includes('profiles')) {
    return 'Nickname setup is blocked by Supabase security policies. Run the latest supabase/community_schema.sql in the Supabase SQL editor, then log out and back in.';
  }
  return message;
};

function CommunityChatV2() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('');
  const [authView, setAuthView] = useState<AuthView>(() => isRecoveryUrl() ? 'reset' : 'auth');
  const [busy, setBusy] = useState(false);
  const user = session?.user ?? null;
  const verified = Boolean(user?.email_confirmed_at);
  const client = supabase;

  useEffect(() => {
    if (!client) return;
    if (isRecoveryUrl()) {
      setAuthView('reset');
      setStatus('Enter a new password to finish resetting your account.');
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (isRecoveryUrl()) {
        setAuthView('reset');
        setStatus('Enter a new password to finish resetting your account.');
      }
    });
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY' || isRecoveryUrl()) {
        setAuthView('reset');
        setStatus('Enter a new password to finish resetting your account.');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (user && verified) void loadProfile(user);
    else setProfile(null);
  }, [user?.id, verified]);

  useEffect(() => {
    if (user && verified && profile?.username) void loadRooms();
  }, [user?.id, verified, profile?.username]);

  useEffect(() => {
    if (selectedRoom && user && verified && profile?.username) void loadMessages(selectedRoom.id);
  }, [selectedRoom?.id, user?.id, verified, profile?.username]);

  const loadProfile = async (currentUser: User) => {
    if (!client) return;
    const { data } = await client.from('profiles').select('id, username, created_at').eq('id', currentUser.id).maybeSingle();
    setProfile((data as MemberProfile | null) ?? { id: currentUser.id, username: null });
  };

  const loadRooms = async () => {
    if (!client) return;
    const { data, error } = await client.from('chat_rooms').select('id, slug, name, description').order('name');
    if (error) {
      setStatus('Run the Supabase SQL setup to create chat rooms.');
      return;
    }
    const nextRooms = (data ?? []) as ChatRoom[];
    setRooms(nextRooms);
    setSelectedRoom((room) => room ?? nextRooms[0] ?? null);
  };

  const loadMessages = async (roomId: string) => {
    if (!client) return;
    const { data, error } = await client.from('chat_messages').select('id, room_id, user_id, username, body, created_at').eq('room_id', roomId).order('created_at', { ascending: true }).limit(100);
    if (error) {
      setStatus('Could not load messages. Check Supabase policies and setup.');
      return;
    }
    setMessages((data ?? []) as ChatMessage[]);
  };

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { error } = await client.auth.signUp({
      email: textField(form, 'email'),
      password: textField(form, 'password'),
      options: { emailRedirectTo: signUpRedirectUrl() }
    });
    setStatus(error ? friendlySupabaseError(error.message) : 'Check your email to verify your account before posting.');
    setBusy(false);
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { error } = await client.auth.signInWithPassword({ email: textField(form, 'email'), password: textField(form, 'password') });
    setStatus(error ? 'Login failed. Check your email and password, or reset your password.' : 'Logged in.');
    setBusy(false);
  };

  const sendResetEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const { error } = await client.auth.resetPasswordForEmail(textField(form, 'email'), { redirectTo: recoveryRedirectUrl() });
    setStatus(error ? friendlySupabaseError(error.message) : 'Password reset email sent. Open it on this device to set a new password.');
    setBusy(false);
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    const form = new FormData(event.currentTarget);
    const password = textField(form, 'password');
    const confirmPassword = textField(form, 'confirmPassword');
    if (password !== confirmPassword) {
      setStatus('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error } = await client.auth.updateUser({ password });
    setStatus(error ? friendlySupabaseError(error.message) : 'Password updated. You can continue to chat.');
    if (!error) {
      setAuthView('auth');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setBusy(false);
  };

  const logout = async () => {
    if (!client) return;
    await client.auth.signOut();
    setProfile(null);
    setRooms([]);
    setMessages([]);
    setAuthView('auth');
  };

  const createUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !user || profile?.username) return;
    const username = textField(new FormData(event.currentTarget), 'username');
    if (!usernamePattern.test(username)) {
      setStatus('Username must be 3-20 characters and use only letters, numbers, and underscores.');
      return;
    }
    setBusy(true);
    const { data: existing, error: lookupError } = await client.from('profiles').select('id').eq('username', username).maybeSingle();
    if (lookupError) {
      setStatus(lookupError.message);
      setBusy(false);
      return;
    }
    if (existing && existing.id !== user.id) {
      setStatus('That username is already taken. Try another one.');
      setBusy(false);
      return;
    }
    const { error } = await client.from('profiles').upsert({ id: user.id, username }, { onConflict: 'id' });
    if (error) setStatus(friendlySupabaseError(error.message));
    else {
      setStatus('');
      await loadProfile(user);
    }
    setBusy(false);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !user || !selectedRoom || !profile?.username) {
      setStatus('Create a username before posting.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const body = textField(form, 'body');
    if (!body) return;
    const { error } = await client.from('chat_messages').insert({ room_id: selectedRoom.id, user_id: user.id, username: profile.username, body });
    if (error) setStatus(error.message);
    else {
      event.currentTarget.reset();
      await loadMessages(selectedRoom.id);
    }
  };

  const deleteMessage = async (message: ChatMessage) => {
    if (!client || !selectedRoom) return;
    const { error } = await client.from('chat_messages').delete().eq('id', message.id);
    if (error) setStatus(error.message);
    else await loadMessages(selectedRoom.id);
  };

  const reportMessage = async (message: ChatMessage) => {
    if (!client || !user) return;
    const { error } = await client.from('message_reports').insert({ message_id: message.id, reporter_id: user.id, reason: 'Reported from app' });
    setStatus(error ? error.message : 'Message reported. Thank you.');
  };

  if (!isSupabaseConfigured) {
    return <Panel title="Community Setup Needed"><p className="font-semibold text-slate-600 dark:text-slate-300">Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable Community Chat. The rest of the app works without login.</p></Panel>;
  }

  if (authView === 'reset') {
    return <section className="space-y-5"><Panel title="Reset Password"><ResetPasswordForm onSubmit={updatePassword} status={status} busy={busy} onBack={() => setAuthView('auth')} /></Panel></section>;
  }

  if (!user) {
    return <section className="space-y-5"><Panel title="Community Rules"><CommunityRules /></Panel>{authView === 'forgot' ? <Panel title="Reset Password"><ResetRequestForm onSubmit={sendResetEmail} status={status} busy={busy} onBack={() => setAuthView('auth')} /></Panel> : <AuthForms onLogin={login} onSignUp={signUp} onForgot={() => { setAuthView('forgot'); setStatus(''); }} status={status} busy={busy} />}</section>;
  }

  if (!verified) {
    return <Panel title="Email Verification Required"><p className="font-semibold text-slate-600 dark:text-slate-300">Please verify your email before creating a username or posting. Your email is never shown publicly.</p><button type="button" onClick={logout} className={`${buttonSecondary} mt-4`}>Log out</button></Panel>;
  }

  if (!profile?.username) {
    return <Panel title="Create Display Username"><p className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Choose one public nickname. It can only be set once. Use 3-20 letters, numbers, or underscores. No spaces.</p><form onSubmit={createUsername} className="space-y-4"><label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">Display username</span><input name="username" type="text" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" autoCorrect="off" className={inputClass} /></label><button disabled={busy} className={buttonPrimary}>{busy ? <InlineLoader text="Checking username" /> : 'Create Username'}</button></form>{status && <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{status}</p>}</Panel>;
  }

  return <section className="space-y-5"><Panel title="Community Rules"><CommunityRules /><div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-600 dark:text-slate-300">Posting as {profile.username}</p><button type="button" onClick={logout} className={buttonSecondary}>Log out</button></div></Panel><Panel title="Chat Rooms"><div className="flex gap-2 overflow-x-auto pb-2">{(rooms.length ? rooms : fallbackRooms.map((name, index) => ({ id: String(index), slug: name.toLowerCase().replaceAll(' ', '-'), name }))).map((room) => <button key={room.id} type="button" onClick={() => setSelectedRoom(room as ChatRoom)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${selectedRoom?.id === room.id ? 'bg-salt-700 text-white dark:bg-salt-500 dark:text-slate-950' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{room.name}</button>)}</div></Panel><Panel title={selectedRoom?.name ?? 'Messages'}>{status && <p className="mb-3 text-sm font-bold text-rose-700 dark:text-rose-200">{status}</p>}<div className="space-y-3">{messages.length === 0 ? <Empty text="No messages yet." /> : messages.map((message) => <div key={message.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{message.username || 'Member'}</p><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(message.created_at).toLocaleString()}</p></div><div className="flex gap-2"><button type="button" onClick={() => reportMessage(message)} className="text-xs font-bold text-amber-700 dark:text-amber-300">Report</button>{message.user_id === user.id && <button type="button" onClick={() => deleteMessage(message)} className="text-xs font-bold text-rose-700 dark:text-rose-300">Delete</button>}<button type="button" disabled className="text-xs font-bold text-slate-400">Admin delete</button></div></div><p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-700 dark:text-slate-200">{message.body}</p></div>)}</div><form onSubmit={sendMessage} className="mt-4 space-y-3"><TextArea name="body" label="Message" /><button className={buttonPrimary}>Send Message</button></form></Panel></section>;
}

function AuthForms({ onLogin, onSignUp, onForgot, status, busy }: { onLogin: (event: FormEvent<HTMLFormElement>) => void; onSignUp: (event: FormEvent<HTMLFormElement>) => void; onForgot: () => void; status: string; busy: boolean }) {
  return <div className="grid gap-5 sm:grid-cols-2"><Panel title="Log In"><form onSubmit={onLogin} className="space-y-4"><Input name="email" label="Email" type="email" autoComplete="email" /><PasswordField name="password" label="Password" autoComplete="current-password" /><button disabled={busy} className={buttonPrimary}>{busy ? <InlineLoader text="Working" /> : 'Log In'}</button><button type="button" onClick={onForgot} className="min-h-11 text-left text-sm font-bold text-salt-700 dark:text-salt-300">Forgot password?</button></form></Panel><Panel title="Sign Up"><form onSubmit={onSignUp} className="space-y-4"><Input name="email" label="Email" type="email" autoComplete="email" /><PasswordField name="password" label="Password" autoComplete="new-password" /><button disabled={busy} className={buttonPrimary}>{busy ? <InlineLoader text="Working" /> : 'Create Account'}</button></form>{status && <p className="mt-3 text-sm font-bold text-salt-700 dark:text-salt-300">{status}</p>}</Panel></div>;
}

function ResetRequestForm({ onSubmit, status, busy, onBack }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; status: string; busy: boolean; onBack: () => void }) {
  return <form onSubmit={onSubmit} className="space-y-4"><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Enter your account email and Supabase will send a secure reset link back to this app.</p><Input name="email" label="Email" type="email" autoComplete="email" /><div className="grid grid-cols-2 gap-3"><button disabled={busy} className={buttonPrimary}>{busy ? <InlineLoader text="Sending" /> : 'Send Reset Email'}</button><button type="button" onClick={onBack} className={buttonSecondary}>Back</button></div>{status && <p className="text-sm font-bold text-salt-700 dark:text-salt-300">{status}</p>}</form>;
}

function ResetPasswordForm({ onSubmit, status, busy, onBack }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; status: string; busy: boolean; onBack: () => void }) {
  return <form onSubmit={onSubmit} className="space-y-4"><PasswordField name="password" label="New password" autoComplete="new-password" /><PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" /><div className="grid grid-cols-2 gap-3"><button disabled={busy} className={buttonPrimary}>{busy ? <InlineLoader text="Saving" /> : 'Update Password'}</button><button type="button" onClick={onBack} className={buttonSecondary}>Back</button></div>{status && <p className="text-sm font-bold text-salt-700 dark:text-salt-300">{status}</p>}</form>;
}

function PasswordField({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  const Icon = show ? EyeOff : Eye;
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><span className="relative block"><input name={name} type={show ? 'text' : 'password'} autoComplete={autoComplete} className={`${inputClass} pr-14`} /><button type="button" onClick={() => setShow((value) => !value)} className="absolute bottom-1.5 right-1.5 grid h-10 w-10 place-items-center rounded-lg text-slate-500 active:scale-95 dark:text-slate-300" aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}><Icon size={20} aria-hidden="true" /></button></span></label>;
}

function Input({ name, label, type, autoComplete }: { name: string; label: string; type: string; autoComplete?: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><input name={name} type={type} autoComplete={autoComplete} className={inputClass} /></label>;
}

function TextArea({ name, label }: { name: string; label: string }) {
  return <label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</span><textarea name={name} rows={4} className={inputClass} /></label>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl bg-white p-4 shadow-soft transition-colors dark:bg-slate-900 dark:shadow-night"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>;
}

function CommunityRules() {
  return <div className="space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><p>Be kind, avoid medical directives, protect privacy, and do not share anyone's email or private details.</p><p>Abuse, harassment, spam, or dangerous advice may be reported. Moderation is minimal for now.</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div role="status" className="rounded-xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">{text}</div>;
}

function InlineLoader({ text }: { text: string }) {
  return <span className="inline-flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} aria-hidden="true" />{text}</span>;
}

export default CommunityChatV2;
