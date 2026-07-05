import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { authService } from './services/auth';
import { dbService } from './services/db';
import { Candidate, PaymentMethod, SiteConfig, UserProfile, Vote } from './types';
import { Toaster, toast } from 'react-hot-toast';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Crown,
  Landmark,
  LayoutDashboard,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Trash2,
  Upload,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const DEFAULT_CONFIG: SiteConfig = {
  votePrice: 100,
  eventName: 'La Villa des Immatures',
  eventDescription: 'Une experience de vote chic, rapide et vivante pour celebrer les personnalites les plus memorables.'
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'orange-money', name: 'Orange Money', icon: 'smartphone', color: '#ff7900', enabled: true },
  { id: 'mtn-momo', name: 'MTN Mobile Money', icon: 'smartphone', color: '#ffcc00', enabled: true },
  { id: 'moov-money', name: 'Moov Money', icon: 'smartphone', color: '#0072ce', enabled: true },
  { id: 'paypal', name: 'PayPal', icon: 'wallet', color: '#0070ba', enabled: true },
  { id: 'visa', name: 'Visa', icon: 'card', color: '#1a1f71', enabled: true },
  { id: 'mastercard', name: 'Mastercard', icon: 'card', color: '#eb001b', enabled: true },
  { id: 'bank-card', name: 'Carte bancaire', icon: 'card', color: '#d4af37', enabled: true },
  { id: 'bank-transfer', name: 'Virement bancaire', icon: 'bank', color: '#fafafa', enabled: true },
  { id: 'cash-demo', name: 'Cash demo', icon: 'cash', color: '#22c55e', enabled: true }
];

const formatMoney = (value: number) => new Intl.NumberFormat('fr-CM').format(value);

const positionLabel = (position: number) => `${position}${position === 1 ? 'er' : 'eme'}`;

const getAuthErrorMessage = (error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

  if (code === 'auth/unauthorized-domain') {
    return "Connexion Google bloquee: ajoutez le domaine actuel dans Firebase Authentication > Settings > Authorized domains.";
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Connexion annulee avant la fin.';
  }

  if (code === 'auth/popup-blocked') {
    return 'Popup Google bloquee par le navigateur. Autorisez les popups pour ce site.';
  }

  return error instanceof Error ? error.message : 'Erreur de connexion';
};

const getPaymentIcon = (icon: string) => {
  if (icon === 'smartphone') return Smartphone;
  if (icon === 'wallet') return Wallet;
  if (icon === 'bank') return Landmark;
  if (icon === 'cash') return Banknote;
  return CreditCard;
};

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center luxury-bg">
    <div className="relative">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="h-14 w-14 rounded-full border-4 border-gold-500 border-t-transparent"
      />
      <div className="absolute inset-3 rounded-full bg-red-700/30 blur-md" />
    </div>
  </div>
);

const Navbar = ({ user, profile, onLogout, view, setView }: {
  user: User | null;
  profile: UserProfile | null;
  onLogout: () => void;
  view: 'vote' | 'admin';
  setView: (v: 'vote' | 'admin') => void;
}) => (
  <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-red-700 via-black to-gold-500 p-3 shadow-[0_0_30px_rgba(191,149,63,0.25)]">
          <Crown className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-300">Vote de prestige</p>
          <p className="font-serif text-xl font-black text-white sm:text-2xl">La Villa des Immatures</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center gap-4">
          {profile?.role === 'admin' && (
            <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-1 sm:flex">
              <button
                onClick={() => setView('vote')}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${view === 'vote' ? 'bg-gold-500 text-black' : 'text-slate-400 hover:text-white'}`}
              >
                Voter
              </button>
              <button
                onClick={() => setView('admin')}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${view === 'admin' ? 'bg-gold-500 text-black' : 'text-slate-400 hover:text-white'}`}
              >
                Admin
              </button>
            </div>
          )}
          <div className="hidden text-right md:block">
            <p className="text-sm font-bold text-white">{profile?.name}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-500">{profile?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl border border-white/10 p-3 text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
            title="Deconnexion"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  </nav>
);

const CandidateCard = ({ candidate, position, onOpen, disabled, hasVoted }: {
  candidate: Candidate;
  position: number;
  onOpen: (candidate: Candidate) => void;
  disabled: boolean;
  hasVoted: boolean;
}) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    whileHover={{ y: -8 }}
    className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-xl"
  >
    <div className="relative aspect-[16/13] overflow-hidden bg-black">
      <img
        src={candidate.image || `https://picsum.photos/seed/${candidate.id}/900/700`}
        alt={candidate.name}
        loading="lazy"
        className="h-full w-full object-cover transition duration-700 group-hover:scale-110 group-hover:rotate-1"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      <div className={`ranking-badge ${position === 1 ? 'ranking-1' : position === 2 ? 'ranking-2' : position === 3 ? 'ranking-3' : 'bg-black/70 text-white ring-1 ring-white/15'}`}>
        {positionLabel(position)}
      </div>
      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-gold-500/30 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-gold-300">
            {formatMoney(candidate.voteCount)} votes
          </p>
          <h3 className="font-serif text-3xl font-black leading-none text-white">{candidate.name}</h3>
        </div>
        {position === 1 && <Crown className="h-9 w-9 flex-shrink-0 text-gold-400 drop-shadow" />}
      </div>
    </div>

    <div className="space-y-5 p-6">
      <p className="line-clamp-3 min-h-[4.5rem] text-sm font-medium leading-relaxed text-slate-300">
        {candidate.description || 'Une candidate prete a marquer la soiree avec style, energie et presence.'}
      </p>
      <button
        onClick={() => onOpen(candidate)}
        disabled={disabled && !hasVoted}
        className="w-full rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-[0.22em] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 gold-button"
      >
        {hasVoted ? 'Voir mon choix' : 'Voter maintenant'}
      </button>
    </div>
  </motion.article>
);

const PaymentSheet = ({ candidate, config, onClose, onConfirm, processing }: {
  candidate: Candidate;
  config: SiteConfig;
  onClose: () => void;
  onConfirm: (quantity: number, amount: number, method: string) => void;
  processing: boolean;
}) => {
  const [amount, setAmount] = useState(config.votePrice * 20);
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const votePrice = Math.max(1, Number(config.votePrice) || DEFAULT_CONFIG.votePrice);
  const quantity = Math.floor(Math.max(0, amount) / votePrice);
  const compatibleAmount = quantity * votePrice;
  const lostAmount = Math.max(0, amount - compatibleAmount);

  const setVotes = (votes: number) => setAmount(votes * votePrice);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 px-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="payment-modal max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[2.5rem] border border-white/10 bg-[#080606] p-5 shadow-[0_-30px_100px_rgba(127,29,29,0.45)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-7 flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-gold-500">Paiement demonstration</p>
            <h3 className="mt-2 font-serif text-3xl font-black text-white">Poursuivre le vote pour {candidate.name}</h3>
            <p className="mt-2 text-sm text-slate-400">Prix admin actuel: {formatMoney(votePrice)} FCFA / vote.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-3 text-slate-300 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
              Montant a depenser
            </label>
            <div className="flex items-center rounded-2xl border border-white/10 bg-black/40 px-5 py-4">
              <input
                type="number"
                min={votePrice}
                step={votePrice}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-full bg-transparent text-3xl font-black text-white outline-none"
              />
              <span className="text-xs font-black uppercase tracking-widest text-gold-400">FCFA</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[10, 20, 50].map((votes) => (
                <button
                  key={votes}
                  type="button"
                  onClick={() => setVotes(votes)}
                  className="rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-black text-white transition hover:border-gold-500/50 hover:bg-gold-500/10"
                >
                  {votes} votes
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-gold-500/25 bg-gold-500/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-300">Resultat calcule</p>
              <p className="mt-2 font-serif text-5xl font-black text-white">{formatMoney(quantity)}</p>
              <p className="mt-1 text-sm text-slate-400">votes seront ajoutes apres validation fictive.</p>
              {lostAmount > 0 && (
                <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-200">
                  {formatMoney(lostAmount)} FCFA ne correspond pas au prix d'un vote. L'application arrondit par defaut a {formatMoney(compatibleAmount)} FCFA utiles.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-300">Choisir un moyen de paiement demo</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = getPaymentIcon(method.icon);
                const active = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? 'border-gold-500 bg-gold-500/15' : 'border-white/10 bg-white/[0.04] hover:border-white/25'}`}
                  >
                    <span className="rounded-xl p-3" style={{ backgroundColor: `${method.color}22`, color: method.color }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-white">{method.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Validation fictive</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              disabled={processing || quantity < 1}
              onClick={() => onConfirm(quantity, compatibleAmount, selectedMethod)}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-sm font-black uppercase tracking-[0.24em] transition disabled:cursor-not-allowed disabled:opacity-50 gold-button"
            >
              {processing ? 'Validation en cours...' : `Valider ${formatMoney(quantity)} votes`}
              <ShieldCheck className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CandidateDetail = ({ candidate, position, config, hasVoted, onBack, onStartVote, userVote }: {
  candidate: Candidate;
  position: number;
  config: SiteConfig;
  hasVoted: boolean;
  onBack: () => void;
  onStartVote: () => void;
  userVote: Vote | null;
}) => (
  <motion.section
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -30 }}
    className="space-y-8"
  >
    <button
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:border-gold-500/40 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" />
      Retour aux candidats
    </button>

    <div className="grid items-stretch gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative min-h-[520px] overflow-hidden rounded-[3rem] border border-white/10 bg-black shadow-2xl"
      >
        <img
          src={candidate.image || `https://picsum.photos/seed/${candidate.id}/900/1100`}
          alt={candidate.name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className={`ranking-badge ${position === 1 ? 'ranking-1' : position === 2 ? 'ranking-2' : position === 3 ? 'ranking-3' : 'bg-black/70 text-white ring-1 ring-white/15'}`}>
          {positionLabel(position)}
        </div>
      </motion.div>

      <div className="flex flex-col justify-center rounded-[3rem] border border-white/10 bg-white/[0.055] p-7 backdrop-blur-xl sm:p-10">
        <p className="mb-4 inline-flex w-fit rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-red-200">
          Page candidate unique
        </p>
        <h2 className="font-serif text-5xl font-black leading-none text-white sm:text-7xl">{candidate.name}</h2>
        <div className="my-7 h-px w-full bg-gradient-to-r from-gold-500 via-red-600 to-transparent" />
        <p className="text-lg font-medium leading-relaxed text-slate-300">
          {candidate.fullDescription || candidate.description || 'Une presence forte, une energie singuliere et une envie claire de briller pendant La Villa des Immatures.'}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gold-400">Position</p>
            <p className="mt-2 text-3xl font-black text-white">{positionLabel(position)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gold-400">Votes</p>
            <p className="mt-2 text-3xl font-black text-white">{formatMoney(candidate.voteCount)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gold-400">Prix vote</p>
            <p className="mt-2 text-3xl font-black text-white">{formatMoney(config.votePrice)}</p>
          </div>
        </div>

        {hasVoted ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-emerald-100">
            <CheckCircle2 className="mb-3 h-6 w-6" />
            <p className="font-black">Votre vote est deja enregistre pour cette session.</p>
            <p className="mt-1 text-sm opacity-80">{formatMoney(userVote?.quantity || 1)} votes valides.</p>
          </div>
        ) : (
          <button
            onClick={onStartVote}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl px-8 py-5 text-sm font-black uppercase tracking-[0.25em] gold-button"
          >
            Poursuivre le vote
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  </motion.section>
);

const AdminPanel = ({ candidates, users, votes, config }: {
  candidates: Candidate[];
  users: UserProfile[];
  votes: Vote[];
  config: SiteConfig;
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'settings' | 'candidates' | 'users' | 'admins'>('stats');
  const [newCandidate, setNewCandidate] = useState({ name: '', description: '', fullDescription: '', image: '' });
  const [adminEmails, setAdminEmails] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [votePrice, setVotePrice] = useState(config.votePrice);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalVotes = votes.reduce((sum, vote) => sum + (Number(vote.quantity) || 1), 0);

  useEffect(() => setVotePrice(config.votePrice), [config.votePrice]);

  useEffect(() => {
    if (activeTab === 'admins') {
      const unsub = dbService.subscribeAdminEmails(setAdminEmails);
      return () => unsub();
    }
  }, [activeTab]);

  const handleSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    await dbService.updateSiteConfig({ votePrice: Math.max(1, Math.floor(votePrice)), eventName: DEFAULT_CONFIG.eventName, eventDescription: DEFAULT_CONFIG.eventDescription });
    toast.success('Prix du vote mis a jour');
  };

  const handleAddAdminEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newAdminEmail) return;
    await dbService.addAdminEmail(newAdminEmail);
    setNewAdminEmail('');
    toast.success('Administrateur ajoute');
  };

  const handleResetDB = async () => {
    const confirmReset = window.confirm('ATTENTION: cette action supprime tous les candidats, tous les votes et reinitialise les participants. Continuer ?');
    if (!confirmReset) return;

    try {
      await dbService.resetDatabase();
      toast.success('Base de donnees reinitialisee');
    } catch (error) {
      toast.error('Erreur lors de la reinitialisation');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 500000) {
      toast.error("L'image est trop lourde (max 500KB)");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewCandidate((previous) => ({ ...previous, image: reader.result as string }));
      setUploading(false);
      toast.success('Image chargee');
    };
    reader.readAsDataURL(file);
  };

  const handleAddCandidate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCandidate.name) return;
    await dbService.addCandidate(newCandidate);
    setNewCandidate({ name: '', description: '', fullDescription: '', image: '' });
    toast.success('Candidat ajoute');
  };

  const tabs = [
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'settings', label: 'Prix vote', icon: Save },
    { id: 'candidates', label: 'Candidats', icon: Trophy },
    { id: 'users', label: 'Participants', icon: Users },
    { id: 'admins', label: 'Admins', icon: Sparkles }
  ] as const;
  const colors = ['#BF953F', '#dc2626', '#FCF6BA', '#991b1b', '#f8fafc'];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition ${activeTab === id ? 'bg-gold-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Icon className="mr-2 inline h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-8 lg:grid-cols-3">
            <div className="glass-card rounded-[2rem] p-8 lg:col-span-2">
              <h3 className="mb-8 font-serif text-xl font-black uppercase tracking-widest text-white">Resultats en direct</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={candidates}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ backgroundColor: '#090606', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }} />
                    <Bar dataKey="voteCount" radius={[10, 10, 0, 0]}>
                      {candidates.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-5">
              <div className="gold-button rounded-[2rem] p-8 text-black">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Total des votes</p>
                <h4 className="mt-2 font-serif text-6xl font-black">{formatMoney(totalVotes)}</h4>
              </div>
              <div className="glass-card rounded-[2rem] p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-500">Prix actuel</p>
                <h4 className="mt-2 font-serif text-5xl font-black text-white">{formatMoney(config.votePrice)}</h4>
                <p className="mt-2 text-xs font-bold text-slate-500">FCFA par vote</p>
              </div>
              <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Zone de danger</p>
                <button onClick={handleResetDB} className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-red-200 transition hover:bg-red-600 hover:text-white">
                  <Trash2 className="mr-2 inline h-4 w-4" />
                  Reinitialiser
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.form key="settings" onSubmit={handleSaveSettings} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card max-w-2xl rounded-[2rem] p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-500">Parametre admin uniquement</p>
            <h3 className="mt-2 font-serif text-4xl font-black text-white">Prix d'un vote</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Ce montant controle automatiquement le calcul des votes dans le modal de paiement. Exemple: si le vote vaut 100 FCFA et que l'utilisateur met 150 FCFA, l'app retient 1 vote.</p>
            <div className="mt-7 flex items-center rounded-2xl border border-white/10 bg-black/35 px-5 py-4">
              <input
                type="number"
                min={1}
                value={votePrice}
                onChange={(event) => setVotePrice(Number(event.target.value))}
                className="w-full bg-transparent text-4xl font-black text-white outline-none"
              />
              <span className="text-xs font-black uppercase tracking-widest text-gold-400">FCFA</span>
            </div>
            <button type="submit" className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-xs font-black uppercase tracking-[0.25em] gold-button">
              <Save className="h-5 w-5" />
              Enregistrer le prix
            </button>
          </motion.form>
        )}

        {activeTab === 'candidates' && (
          <motion.div key="candidates" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <form onSubmit={handleAddCandidate} className="glass-card rounded-[2rem] p-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <input type="text" placeholder="Nom du candidat" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-gold-500" value={newCandidate.name} onChange={(event) => setNewCandidate({ ...newCandidate, name: event.target.value })} />
                  <textarea placeholder="Description courte" rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-gold-500" value={newCandidate.description} onChange={(event) => setNewCandidate({ ...newCandidate, description: event.target.value })} />
                  <textarea placeholder="Description complete pour la page candidat" rows={5} className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-gold-500" value={newCandidate.fullDescription} onChange={(event) => setNewCandidate({ ...newCandidate, fullDescription: event.target.value })} />
                </div>

                <div className="flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/10 bg-white/5 p-6 transition hover:bg-white/10" onClick={() => fileInputRef.current?.click()}>
                  <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                  {newCandidate.image ? (
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                      <img src={newCandidate.image} alt="Preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition hover:opacity-100">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto mb-4 h-10 w-10 text-gold-500" />
                      <p className="font-bold text-white">Uploader une photo</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">JPG, PNG max 500KB</p>
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" disabled={uploading || !newCandidate.name} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-xs font-black uppercase tracking-[0.25em] disabled:opacity-50 gold-button">
                <Plus className="h-5 w-5" />
                Enregistrer le candidat
              </button>
            </form>

            <div className="grid gap-5 md:grid-cols-2">
              {candidates.map((candidate, index) => (
                <div key={candidate.id} className="glass-card flex items-center gap-4 rounded-[2rem] p-5">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900">
                    <img src={candidate.image || `https://picsum.photos/seed/${candidate.id}/200/200`} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-serif text-lg font-black text-white">{candidate.name}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gold-500">{positionLabel(index + 1)} - {formatMoney(candidate.voteCount)} votes</p>
                  </div>
                  <button onClick={() => dbService.deleteCandidate(candidate.id)} className="rounded-xl p-3 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card overflow-hidden rounded-[2rem]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gold-500">Participant</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gold-500">Email</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-gold-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((appUser) => (
                    <tr key={appUser.id} className="transition hover:bg-white/5">
                      <td className="px-8 py-6 font-bold text-white">{appUser.name}</td>
                      <td className="px-8 py-6 text-sm text-slate-400">{appUser.email}</td>
                      <td className="px-8 py-6">
                        {appUser.hasVoted ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Confirme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
                            <AlertCircle className="h-3 w-3" />
                            En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'admins' && (
          <motion.div key="admins" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
            <form onSubmit={handleAddAdminEmail} className="glass-card flex flex-col gap-4 rounded-[2rem] p-8 md:flex-row">
              <input type="email" placeholder="Email du nouvel administrateur" className="flex-grow rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-gold-500" value={newAdminEmail} onChange={(event) => setNewAdminEmail(event.target.value)} required />
              <button type="submit" className="rounded-2xl px-8 py-4 text-xs font-black uppercase tracking-widest gold-button">
                <Plus className="mr-2 inline h-5 w-5" />
                Ajouter
              </button>
            </form>
            <div className="grid gap-5 md:grid-cols-2">
              {adminEmails.map((admin) => (
                <div key={admin.email} className="glass-card flex items-center justify-between rounded-[2rem] p-6">
                  <div>
                    <p className="font-bold text-white">{admin.email}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Ajoute par {admin.addedBy}</p>
                  </div>
                  {admin.email !== 'angekapel007@gmail.com' && (
                    <button onClick={() => dbService.removeAdminEmail(admin.email)} className="rounded-xl p-3 text-slate-500 hover:bg-red-500/10 hover:text-red-400">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [view, setView] = useState<'vote' | 'admin'>('vote');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const orderedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);

  useEffect(() => {
    const unsubscribeAuth = authService.onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          let userProfile = await dbService.getUserProfile(firebaseUser.uid);
          if (firebaseUser.email === 'angekapel007@gmail.com' && userProfile?.role !== 'admin') {
            await dbService.updateUserProfile(firebaseUser.uid, { role: 'admin' });
            userProfile = await dbService.getUserProfile(firebaseUser.uid);
          }

          setProfile(userProfile);
          if (userProfile?.role === 'admin') setView('admin');
        } catch (error) {
          console.error('Error fetching profile', error);
        }
      } else {
        setProfile(null);
        setCandidates([]);
        setSelectedCandidate(null);
        setView('vote');
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribeCandidates = dbService.subscribeCandidates(setCandidates);
    const unsubscribeConfig = dbService.subscribeSiteConfig(setConfig);
    return () => {
      unsubscribeCandidates();
      unsubscribeConfig();
    };
  }, [user]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      const unsubscribeUsers = dbService.subscribeUsers(setUsers);
      const unsubscribeVotes = dbService.subscribeVotes(setVotes);
      return () => {
        unsubscribeUsers();
        unsubscribeVotes();
      };
    }
  }, [profile]);

  useEffect(() => {
    if (user && profile?.hasVoted) {
      dbService.getUserVote(user.uid).then(setUserVote);
    } else {
      setUserVote(null);
    }
  }, [user, profile?.hasVoted]);

  const handleLogin = async () => {
    try {
      await authService.signInWithGoogle();
      toast.success('Bienvenue a La Villa');
    } catch (error) {
      toast.error(getAuthErrorMessage(error), { duration: 7000 });
    }
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await authService.signInWithEmail(email, password);
      toast.success('Bienvenue');
    } catch (error) {
      toast.error(getAuthErrorMessage(error), { duration: 7000 });
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Deconnecte');
  };

  const handlePaidVote = async (quantity: number, amount: number, paymentMethod: string) => {
    if (!user || !selectedCandidate || profile?.hasVoted || quantity < 1) return;

    setVoting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await dbService.castVote(user.uid, selectedCandidate.id, quantity, paymentMethod, amount);
      const updatedProfile = await dbService.getUserProfile(user.uid);
      const updatedVote = await dbService.getUserVote(user.uid);
      setProfile(updatedProfile);
      setUserVote(updatedVote);
      setShowPayment(false);
      toast.success(`${formatMoney(quantity)} votes ajoutes avec succes`);
    } catch (error) {
      toast.error('Erreur lors du vote');
    } finally {
      setVoting(false);
    }
  };

  const handleCancelVote = async () => {
    if (!user || !userVote || voting) return;
    const confirmCancel = window.confirm('Voulez-vous annuler votre vote ?');
    if (!confirmCancel) return;

    setVoting(true);
    try {
      await dbService.cancelVote(user.uid, userVote.candidateId, userVote.quantity || 1);
      const updatedProfile = await dbService.getUserProfile(user.uid);
      setProfile(updatedProfile);
      setUserVote(null);
      toast.success('Vote annule');
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setVoting(false);
    }
  };

  if (loading) return <Loader />;

  const selectedPosition = selectedCandidate ? orderedCandidates.findIndex((candidate) => candidate.id === selectedCandidate.id) + 1 : 0;
  const selectedFreshCandidate = selectedCandidate ? orderedCandidates.find((candidate) => candidate.id === selectedCandidate.id) || selectedCandidate : null;

  return (
    <div className="min-h-screen luxury-bg font-sans text-slate-200 selection:bg-gold-500/30">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#100808',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px'
          }
        }}
      />
      <Navbar user={user} profile={profile} onLogout={handleLogout} view={view} setView={setView} />

      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="pointer-events-none fixed left-[-10%] top-24 h-96 w-96 rounded-full bg-red-700/20 blur-[120px]" />
        <div className="pointer-events-none fixed right-[-10%] top-48 h-96 w-96 rounded-full bg-gold-500/15 blur-[120px]" />

        {!user ? (
          <section className="relative flex min-h-[72vh] items-center justify-center py-16 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold-500/20 bg-white/5 px-4 py-2">
                <Sparkles className="h-4 w-4 text-gold-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-gold-400">Vote de prestige</span>
              </div>
              <h1 className="font-serif text-6xl font-black leading-[0.9] tracking-tighter text-white sm:text-8xl">
                La Villa des <span className="gold-gradient">Immatures</span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-300 sm:text-xl">
                Un vote de prestige rapide, luxueux et vivant. Choisissez votre favori, payez en mode demo, et regardez le classement bouger.
              </p>

              <div className="mx-auto mt-12 max-w-md space-y-7">
                <button onClick={handleLogin} className="flex w-full items-center justify-center gap-4 rounded-2xl bg-white px-10 py-5 text-lg font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.12)] transition hover:bg-gold-500 hover:scale-[1.02]">
                  <img src="https://www.google.com/favicon.ico" className="h-6 w-6" alt="Google" loading="lazy" />
                  Continuer avec Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.4em]"><span className="bg-[#080606] px-4 font-black text-slate-500">Ou</span></div>
                </div>

                {!showEmailLogin ? (
                  <button onClick={() => setShowEmailLogin(true)} className="text-xs font-black uppercase tracking-widest text-gold-400 transition hover:text-white">
                    Acces par identifiants
                  </button>
                ) : (
                  <form onSubmit={handleEmailLogin} className="glass-card space-y-5 rounded-[2.5rem] p-8 text-left">
                    <input type="email" required placeholder="Adresse email" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-gold-500" value={email} onChange={(event) => setEmail(event.target.value)} />
                    <input type="password" required placeholder="Mot de passe" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none focus:ring-2 focus:ring-gold-500" value={password} onChange={(event) => setPassword(event.target.value)} />
                    <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-2xl py-5 gold-button">
                      Se connecter
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </section>
        ) : (
          <div className="space-y-14">
            {profile?.role === 'admin' && (
              <div className="flex justify-center sm:hidden">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button onClick={() => setView('vote')} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${view === 'vote' ? 'bg-gold-500 text-black' : 'text-slate-400'}`}>Voter</button>
                  <button onClick={() => setView('admin')} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${view === 'admin' ? 'bg-gold-500 text-black' : 'text-slate-400'}`}>Admin</button>
                </div>
              </div>
            )}

            {profile?.role === 'admin' && view === 'admin' ? (
              <AdminPanel candidates={orderedCandidates} users={users} votes={votes} config={config} />
            ) : (
              <AnimatePresence mode="wait">
                {selectedFreshCandidate ? (
                  <React.Fragment key="candidate-detail">
                    <CandidateDetail
                      candidate={selectedFreshCandidate}
                      position={selectedPosition}
                      config={config}
                      hasVoted={Boolean(profile?.hasVoted)}
                      userVote={userVote}
                      onBack={() => setSelectedCandidate(null)}
                      onStartVote={() => setShowPayment(true)}
                    />
                  </React.Fragment>
                ) : (
                  <motion.section key="candidate-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
                    <header className="mx-auto max-w-3xl text-center">
                      <p className="mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-red-300">{config.eventName}</p>
                      <h2 className="font-serif text-5xl font-black leading-none text-white sm:text-7xl">
                        Classement <span className="gold-gradient">en direct</span>
                      </h2>
                      <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-300">
                        Les candidats sont affiches du plus vote au moins vote. Le premier est donc toujours en tete du prestige.
                      </p>
                    </header>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      {orderedCandidates.map((candidate, index) => (
                        <React.Fragment key={candidate.id}>
                          <CandidateCard
                            candidate={candidate}
                            position={index + 1}
                            onOpen={setSelectedCandidate}
                            disabled={voting || Boolean(profile?.hasVoted)}
                            hasVoted={userVote?.candidateId === candidate.id}
                          />
                        </React.Fragment>
                      ))}
                      {orderedCandidates.length === 0 && (
                        <div className="col-span-full rounded-[3rem] border-2 border-dashed border-white/10 bg-white/[0.03] py-32 text-center">
                          <Trophy className="mx-auto mb-6 h-16 w-16 text-white/10" />
                          <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">Ouverture des candidatures prochainement</p>
                        </div>
                      )}
                    </div>

                    {profile?.hasVoted && (
                      <div className="flex justify-center">
                        <button onClick={handleCancelVote} disabled={voting} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-300 transition hover:text-red-200 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                          Annuler mon vote pour changer de choix
                        </button>
                      </div>
                    )}
                  </motion.section>
                )}
              </AnimatePresence>
            )}
          </div>
        )}
      </main>

      <footer className="relative mt-20 overflow-hidden border-t border-white/5 py-16">
        <div className="absolute left-1/2 top-0 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 text-center">
          <LayoutDashboard className="mx-auto mb-5 h-8 w-8 text-gold-500/70" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
            &copy; 2026 La Villa des Immatures - Demo vote prestige
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showPayment && selectedFreshCandidate && (
          <PaymentSheet
            candidate={selectedFreshCandidate}
            config={config}
            onClose={() => setShowPayment(false)}
            onConfirm={handlePaidVote}
            processing={voting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
