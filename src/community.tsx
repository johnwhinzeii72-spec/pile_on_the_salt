import { useEffect, useRef, useState } from 'react';
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
const pendingId = () => `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const formatTime = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const communityAuthRedirectUrl = (auth: 'verify' | 'recovery') => {
  const url = new URL(window.location.href);
  url.searchParams.set('page', 'community');
  url.searchParams.set('auth', auth);
  url.hash = '';
  return url.toString();
};
const signUpRedirectUrl = () => communityAuthRedirectUrl('verify');
const recoveryRedirectUrl = () => communityAuthRedirectUrl('recovery');
const authParams = () => {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return { search, hash };
};
const isRecoveryUrl = () => {
  const { search, hash } = authParams();
  return search.get('auth') === 'recovery' || search.get('type') === 'recovery' || hash.get('type') === 'recovery';
};
const isVerificationUrl = () => {
  const { search, hash } = authParams();
  return search.get('auth') === 'verify' || ['signup', 'invite', 'email_change'].includes(search.get('type') ?? '') || ['signup', 'invite', 'email_change'].includes(hash.get('type') ?? '');
};
const friendlySupabaseError = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes('email rate limit')) return 'Too many emails were sent recently. Please wait a few minutes before trying again. For production, configure custom SMTP in Supabase Auth to raise this limit.';
  if (lower.includes('row-level security') && lower.includes('profiles')) return 'Nickname setup is blocked by Supabase security policies. Run the latest supabase/community_schema.sql in the Supabase SQL editor, then log out and back in.';
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
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendState, setSendState] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const user = session?.user ?? null;
  const verified = Boolean(user?.email_confirmed_at);
  const client = supabase;

  useEffect(() => {
    if (!client) return;
    if (isRecoveryUrl()) {
      setAuthView('reset');
      setStatus('Enter a new password to finish resetting your account.');
    } else if (isVerificationUrl()) {
      setStatus('Finishing email verification...');
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (isRecoveryUrl()) {
        setAuthView('reset');
        setStatus('Enter a new password to finish resetting your account.');
      } else if (isVerificationUrl()) {
        setStatus(data.session?.user.email_confirmed_at ? 'Email verified. Create a username to enter chat.' : 'Email verification opened. If this does not update, log in with your verified email.');
      }
    });
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY' || isRecoveryUrl()) {
        setAuthView('reset');
        setStatus('Enter a new password to finish resetting your account.');
      } else if (event === 'SIGNED_IN' && isVerificationUrl()) {
        setStatus('Email verified. Create a username to enter chat.');
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, selectedRoom?.id, sendState]);

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
    const { error } = await client.auth.signUp({ email: textField(form, 'email'), password: textField(form, 'password'), options: { emailRedirectTo: signUpRedirectUrl() } });
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
    if (isSending) return;
    if (!client || !user || !selectedRoom || !profile?.username) {
      setStatus('Create a username before posting.');
      return;
    }
    const body = messageText.trim();
    if (!body) return;
    const optimistic: ChatMessage = { id: pendingId(), room_id: selectedRoom.id, user_id: user.id, username: profile.username, body, created_at: new Date().toISOString() };
    setIsSending(true);
    setSendState('Sending...');
    setStatus('');
    setMessageText('');
    setMessages((current) => [...current, optimistic]);
    const { data, error } = await client.from('chat_messages').insert({ room_id: selectedRoom.id, user_id: user.id, username: profile.username, body }).select('id, room_id, user_id, username, body, created_at').single();
    if (error) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setMessageText(body);
      setStatus(friendlySupabaseError(error.message));
      setSendState('Could not send');
    } else {
      setMessages((current) => current.map((message) => message.id === optimistic.id ? data as ChatMessage : message));
      setSendState('Sent');
      window.setTimeout(() => setSendState(''), 1600);
    }
    setIsSending(false);
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

  if (!isSupabaseConfigured) return <Panel title="Community Setup Needed"><p className="font-semibold text-slate-600 dark:text-slate-300">Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable Community Chat. The rest of the app works without login.</p></Panel>;
  if (authView === 'reset') return <section className="space-y-5"><Panel title="Reset Password"><ResetPasswordForm onSubmit={updatePassword} status={status} busy={busy} onBack={() => setAuthView('auth')} /></Panel></section>;
  if (!user) return <section className="space-y-5"><Panel title="Community Rules"><CommunityRules /></Panel>{authView === 'forgot' ? <Panel title="Reset Password"><ResetRequestForm onSubmit={sendResetEmail} status={status} busy={busy} onBack={() => setAuthView('auth')} /></Panel> : <AuthForms onLogin={login} onSignUp={signUp} onForgot={() => { setAuthView('forgot'); setStatus(''); }} status={status} busy={busy} />}</section>;
  if (!verified) return <Panel title="Email Verification Required"><p className="font-semibold text-slate-600 dark:text-slate-300">Please verify your email before creating a username or posting. Your email is never shown publicly.</p><button type="button" onClick={logout} className={`${buttonSecondary} mt-4`}>Log out</button></Panel>;
  if (!profile?.username) return <Panel title="Create Display Username"><p className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Choose one public nickname. It can only be set once. Use 3-20 letters, numbers, or underscores. No spaces.</p><form onSubmit={createUsername} className="space-y-4"><label className="block"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">Display username</span><input name="username" type="text" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" autoCorrect="off" className={inputClass} /></label><button disabled={busy} className={buttonPrimary}>{busy ? <InlineLoader text="Checking username" /> : 'Create Username'}</button></form>{status && <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{status}</p>}</Panel>;

  const roomList = rooms.length ? rooms : fallbackRooms.map((name, index) => ({ id: String(index), slug: name.toLowerCase().replaceAll(' ', '-'), name }));

  return <section className="space-y-4"><Panel title="Community"><CommunityRules /><div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10"><p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">Posting as {profile.username}</p><button type="button" onClick={logout} className="min-h-10 rounded-lg px-3 text-sm font-bold text-slate-600 transition active:scale-95 dark:text-slate-300">Log out</button></div></Panel><Panel title="Rooms"><div className="flex gap-2 overflow-x-auto pb-1" aria-label="Chat rooms">{roomList.map((room) => <button key={room.id} type="button" onClick={() => setSelectedRoom(room as ChatRoom)} aria-pressed={selectedRoom?.id === room.id} className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${selectedRoom?.id === room.id ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200 dark:bg-emerald-400/20 dark:text-emerald-50 dark:ring-emerald-400/25' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:ring-slate-700'}`}>{room.name}</button>)}</div></Panel><Panel title={selectedRoom?.name ?? 'Messages'}>{status && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800 dark:bg-rose-500/15 dark:text-rose-100">{status}</p>}<div className="rounded-2xl bg-emerald-50/45 p-2 ring-1 ring-emerald-100 dark:bg-slate-950 dark:ring-slate-800"><div className="max-h-[58vh] space-y-3 overflow-y-auto px-1 py-2" aria-live="polite">{messages.length === 0 ? <Empty text="No messages yet. You can start gently." /> : messages.map((message) => <MessageBubble key={message.id} message={message} currentUserId={user.id} onReport={() => reportMessage(message)} onDelete={() => deleteMessage(message)} />)}<div ref={bottomRef} /></div><form onSubmit={sendMessage} className="mt-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100 dark:bg-slate-900 dark:ring-slate-800"><label className="block"><span className="sr-only">Message</span><textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} disabled={isSending} rows={3} maxLength={1000} placeholder="Share something supportive..." className="min-h-24 w-full resize-none rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-emerald-500/15" /></label><div className="mt-3 flex items-center justify-between gap-3"><p role="status" className="min-h-5 text-xs font-bold text-slate-500 dark:text-slate-400">{sendState}</p><button disabled={isSending || !messageText.trim()} className="min-h-11 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-black text-white transition active:scale-95 disabled:bg-slate-300 dark:bg-emerald-400 dark:text-slate-950 dark:disabled:bg-slate-700 dark:disabled:text-slate-400">{isSending ? <InlineLoader text="Sending" /> : 'Send'}</button></div></form></div></Panel></section>;
}

function MessageBubble({ message, currentUserId, onReport, onDelete }: { message: ChatMessage; currentUserId: string; onReport: () => void; onDelete: () => void }) {
  const own = message.user_id === currentUserId;
  const pending = message.id.startsWith('pending-');
  return <article className={`flex ${own ? 'justify-end' : 'justify-start'}`} aria-label={`Message from ${message.username || 'Member'}`}><div className={`max-w-[88%] rounded-2xl px-3 py-3 shadow-sm ring-1 ${own ? 'bg-emerald-700 text-white ring-emerald-700/10 dark:bg-emerald-500 dark:text-slate-950' : 'bg-white text-slate-800 ring-emerald-100 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800'}`}><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className={`text-sm font-black ${own ? 'text-white dark:text-slate-950' : 'text-emerald-950 dark:text-emerald-100'}`}>{message.username || 'Member'}</p><time className={`text-[11px] font-bold ${own ? 'text-emerald-50/80 dark:text-slate-800' : 'text-slate-400 dark:text-slate-500'}`} dateTime={message.created_at}>{formatTime(message.created_at)}</time>{pending && <span className="text-[11px] font-bold opacity-80">sending</span>}</div><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{message.body}</p><div className={`mt-2 flex justify-end gap-3 text-[11px] font-bold ${own ? 'text-emerald-50/85 dark:text-slate-800' : 'text-slate-400 dark:text-slate-500'}`}><button type="button" onClick={onReport} className="min-h-8">Report</button>{own && !pending && <button type="button" onClick={onDelete} className="min-h-8">Delete</button>}<button type="button" disabled className="min-h-8 opacity-50">Admin</button></div></div></article>;
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl bg-white p-4 shadow-soft transition-colors dark:bg-slate-900 dark:shadow-night"><h2 className="mb-4 text-lg font-black">{title}</h2>{children}</section>;
}

function CommunityRules() {
  return <div className="space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><p>Be kind, avoid medical directives, protect privacy, and do not share anyone's email or private details.</p><p>Share support and lived experience, not medical directives. Reports are reviewed with minimal moderation for now.</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div role="status" className="rounded-xl bg-white/80 p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-emerald-100 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">{text}</div>;
}

function InlineLoader({ text }: { text: string }) {
  return <span className="inline-flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} aria-hidden="true" />{text}</span>;
}

export default CommunityChatV2;
