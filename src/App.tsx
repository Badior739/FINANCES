import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  Home,
  Package,
  Trash2,
  Code2,
  Sun,
  Moon,
  Check,
  Copy,
  ChevronRight,
  Info,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type TransactionType = 'IN' | 'OUT';
export type TransactionCategory = 'SALE' | 'LIFE' | 'REINVESTMENT';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  createdAt: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    amount: 45000,
    type: 'IN',
    category: 'SALE',
    description: 'Vente 3 pagnes Wax Hollandais',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 'tx-2',
    amount: 15000,
    type: 'OUT',
    category: 'LIFE',
    description: 'Dépense popote maison & enfants',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'tx-3',
    amount: 30000,
    type: 'IN',
    category: 'SALE',
    description: 'Vente lots de pagnes & foulards',
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 'tx-4',
    amount: 25000,
    type: 'OUT',
    category: 'LIFE',
    description: 'Pharmacie & ordonnance maman',
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'tx-5',
    amount: 20000,
    type: 'OUT',
    category: 'REINVESTMENT',
    description: 'Achat rouleau fil & emballages',
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
  },
];

// Synthétiseur audio léger pour retour tactile sonore sans fichier externe
const playSound = (kind: 'sale' | 'expense' | 'alert' | 'click', enabled: boolean) => {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (kind === 'sale') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (kind === 'expense') {
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (kind === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch {
    // Ignore audio failures if restricted
  }
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('finance_mgs_transactions');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return INITIAL_TRANSACTIONS;
        }
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [currency, setCurrency] = useState('FCFA');
  const [isHighSunlight, setIsHighSunlight] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [viewCodeModal, setViewCodeModal] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal d'ajout rapide de transaction
  const [activeModal, setActiveModal] = useState<TransactionType | null>(null);
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<TransactionCategory>('SALE');
  const [formDescription, setFormDescription] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('finance_mgs_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Calculs du mois
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalSale = 0;
    let totalLife = 0;
    let totalReinvestment = 0;

    for (const tx of transactions) {
      if (tx.type === 'IN') {
        totalIn += tx.amount;
        if (tx.category === 'SALE') {
          totalSale += tx.amount;
        }
      } else {
        totalOut += tx.amount;
        if (tx.category === 'LIFE') {
          totalLife += tx.amount;
        } else if (tx.category === 'REINVESTMENT') {
          totalReinvestment += tx.amount;
        }
      }
    }

    const netBenefit = totalIn - totalOut;
    const lifeThreshold = totalSale * 0.3;
    const isLifeAlert = totalSale > 0 ? totalLife > lifeThreshold : totalLife > 0;
    const lifeRatio = totalSale > 0 ? Math.round((totalLife / totalSale) * 1000) / 10 : (totalLife > 0 ? 100 : 0);

    return {
      totalIn,
      totalOut,
      netBenefit,
      totalSale,
      totalLife,
      totalReinvestment,
      isLifeAlert,
      lifeRatio,
      lifeThreshold: Math.round(lifeThreshold),
    };
  }, [transactions]);

  // Jouer son d'alerte lors du franchissement des 30%
  useEffect(() => {
    if (metrics.isLifeAlert) {
      playSound('alert', soundEnabled);
    }
  }, [metrics.isLifeAlert, soundEnabled]);

  // 5 dernières transactions
  const latestFive = useMemo(() => {
    return [...transactions].slice(0, 5);
  }, [transactions]);

  const formatMoney = (amount: number) => {
    return `${new Intl.NumberFormat('fr-FR').format(Math.abs(amount))} ${currency}`;
  };

  const handleOpenModal = (type: TransactionType) => {
    playSound('click', soundEnabled);
    setActiveModal(type);
    setFormAmount('');
    setFormDescription('');
    setFormCategory(type === 'IN' ? 'SALE' : 'LIFE');
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setFormAmount('');
    setFormDescription('');
  };

  const handleQuickAddPreset = (val: number) => {
    playSound('click', soundEnabled);
    const curr = parseInt(formAmount || '0', 10);
    setFormAmount(String(curr + val));
  };

  const handleSubmitTransaction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(formAmount.replace(/\D/g, ''), 10);
    if (!parsed || parsed <= 0 || !activeModal) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      amount: parsed,
      type: activeModal,
      category: formCategory,
      description: formDescription.trim() || (activeModal === 'IN' ? 'Vente boutique' : formCategory === 'LIFE' ? 'Dépense personnelle' : 'Achat stock'),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    playSound(activeModal === 'IN' ? 'sale' : 'expense', soundEnabled);
    handleCloseModal();
  };

  const handleDeleteTransaction = (id: string) => {
    playSound('click', soundEnabled);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetDemo = () => {
    playSound('click', soundEnabled);
    setTransactions(INITIAL_TRANSACTIONS);
  };

  const handleSeedAlertScenario = () => {
    // Injecte une grosse dépense LIFE pour tester l'alerte
    playSound('alert', soundEnabled);
    const alertTx: Transaction = {
      id: `tx-${Date.now()}`,
      amount: 40000,
      type: 'OUT',
      category: 'LIFE',
      description: 'Dépense imprévue famille / baptême',
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [alertTx, ...prev]);
  };

  const handleCopyCode = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Contenu des fichiers Next.js & Prisma à afficher
  const schemaPrismaContent = `// schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum TransactionType {
  IN
  OUT
}

enum Category {
  SALE
  LIFE
  REINVESTMENT
}

model User {
  id           String        @id @default(cuid())
  name         String
  phone        String?       @unique
  currency     String        @default("FCFA")
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  transactions Transaction[]
}

model Transaction {
  id          String          @id @default(cuid())
  amount      Int             // En FCFA (sans centimes)
  type        TransactionType // IN = Entrée, OUT = Sortie
  category    Category        // SALE, LIFE, REINVESTMENT
  description String?
  createdAt   DateTime        @default(now())
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}`;

  const actionsCodeContent = `'use server';

import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function addTransaction(formData: FormData) {
  const rawAmount = formData.get('amount')?.toString() ?? '0';
  const amount = Math.abs(parseInt(rawAmount.replace(/\\D/g, ''), 10));
  const type = formData.get('type') as 'IN' | 'OUT';
  const category = formData.get('category') as 'SALE' | 'LIFE' | 'REINVESTMENT';
  const description = formData.get('description')?.toString();

  if (!amount || amount <= 0) {
    throw new Error('Montant invalide');
  }

  // Commerçant par défaut
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Commerçant MGS', phone: '+225 07000000', currency: 'FCFA' }
    });
  }

  await prisma.transaction.create({
    data: {
      amount,
      type,
      category,
      description: description?.trim() || null,
      userId: user.id
    }
  });

  revalidatePath('/');
}

export async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: 'desc' }
  });

  let totalIn = 0, totalOut = 0, totalSale = 0, totalLife = 0;
  for (const tx of transactions) {
    if (tx.type === 'IN') {
      totalIn += tx.amount;
      if (tx.category === 'SALE') totalSale += tx.amount;
    } else {
      totalOut += tx.amount;
      if (tx.category === 'LIFE') totalLife += tx.amount;
    }
  }

  const realBenefit = totalIn - totalOut;
  const isLifeAlert = totalSale > 0 ? totalLife > totalSale * 0.3 : totalLife > 0;
  const lifeRatio = totalSale > 0 ? (totalLife / totalSale) * 100 : 0;

  const latestTransactions = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    realBenefit,
    totalIn,
    totalOut,
    totalSale,
    totalLife,
    isLifeAlert,
    lifeRatio,
    latestTransactions
  };
}`;

  const isNetPositive = metrics.netBenefit >= 0;

  return (
    <div
      className={`min-h-screen transition-colors duration-150 antialiased ${
        isHighSunlight ? 'bg-black text-white' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* BARRE SUPÉRIEURE ÉCRAN PLEIN SOLEIL */}
      <header
        className={`sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between transition-colors ${
          isHighSunlight
            ? 'bg-black border-neutral-700'
            : 'bg-neutral-950/95 backdrop-blur-md border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
            F
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-white">
              Finance-MGS
            </h1>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
              Zéro Excel · Clarté Mobile
            </p>
          </div>
        </div>

        {/* OUTILS RAPIDES EN HAUT : PLEIN SOLEIL / CODE / DEVISE */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsHighSunlight(!isHighSunlight)}
            title="Basculer Contraste Plein Soleil"
            className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer min-h-[40px] ${
              isHighSunlight
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white'
            }`}
          >
            {isHighSunlight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">Plein Soleil</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Désactiver les sons' : 'Activer les sons'}
            className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setViewCodeModal('summary')}
            className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5 cursor-pointer min-h-[40px]"
          >
            <Code2 className="w-4 h-4" />
            <span className="font-mono">Fichiers Next.js</span>
          </button>
        </div>
      </header>

      {/* CONTENEUR APPLICATION MOBILE STRICT (MAX 520PX) */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-4 pb-28">

        {/* 1. BANNIÈRE ORANGE D'AVERTISSEMENT : SI DÉPENSES PERSO (LIFE) > 30% DES VENTES (SALE) */}
        {metrics.isLifeAlert && (
          <div
            role="alert"
            className="p-4 rounded-3xl bg-amber-500 text-black font-extrabold border-2 border-amber-300 shadow-xl shadow-amber-500/20"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-2xl bg-black text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-black tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
                    Alerte Trésorerie
                  </span>
                  <span className="text-xs font-mono font-black underline">
                    {metrics.lifeRatio}% &gt; 30%
                  </span>
                </div>
                <h2 className="text-lg font-black leading-tight text-neutral-950">
                  Dépenses personnelles excessives !
                </h2>
                <p className="text-xs font-bold text-neutral-900 leading-snug">
                  Vos prélèvements perso (LIFE : <strong className="font-mono">{formatMoney(metrics.totalLife)}</strong>)
                  dépassent 30% de vos ventes du mois ({formatMoney(metrics.totalSale)}).
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-black text-neutral-900">
                  <span>Plafond conseillé : {formatMoney(metrics.lifeThreshold)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CARTE HAUTE VISIBILITÉ : BÉNÉFICE RÉEL DU MOIS */}
        <section
          aria-label="Bénéfice Réel du Mois"
          className={`p-6 rounded-3xl border-2 transition-all shadow-2xl ${
            isHighSunlight
              ? isNetPositive
                ? 'bg-neutral-900 border-emerald-400 text-white'
                : 'bg-neutral-900 border-red-500 text-white'
              : isNetPositive
              ? 'bg-neutral-900/90 border-emerald-500/60 shadow-emerald-950/40 text-white'
              : 'bg-neutral-900/90 border-red-500/60 shadow-red-950/40 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-widest uppercase text-neutral-400">
              Bénéfice Réel du Mois
            </span>
            <span
              className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider font-mono ${
                isNetPositive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {isNetPositive ? 'En Bénéfice' : 'En Déficit'}
            </span>
          </div>

          {/* GROS MONTANT LISIBLE EN PLEIN SOLEIL */}
          <div className="my-3">
            <div
              className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums break-words ${
                isNetPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isNetPositive ? '+' : '-'} {formatMoney(metrics.netBenefit)}
            </div>
          </div>

          {/* DÉTAIL ENTRÉES VS SORTIES */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800 text-sm">
            <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-bold block uppercase tracking-wider">
                Total Entrées (IN)
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono tabular-nums block mt-0.5">
                +{formatMoney(metrics.totalIn)}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium mt-0.5 block">
                Ventes boutique : {formatMoney(metrics.totalSale)}
              </span>
            </div>

            <div className="bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-bold block uppercase tracking-wider">
                Total Sorties (OUT)
              </span>
              <span className="text-lg font-black text-red-400 font-mono tabular-nums block mt-0.5">
                -{formatMoney(metrics.totalOut)}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium mt-0.5 block">
                Perso (LIFE) : {formatMoney(metrics.totalLife)}
              </span>
            </div>
          </div>

          {/* BARRE DE PROGRESSION RATIO LIFE VS VENTES */}
          <div className="mt-3 pt-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 mb-1">
              <span>Part Vie Perso / Ventes (Max 30%) :</span>
              <span className={`font-mono font-black ${metrics.isLifeAlert ? 'text-amber-400' : 'text-emerald-400'}`}>
                {metrics.lifeRatio}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 relative">
              {/* Ligne limite 30% */}
              <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-amber-400 z-10" title="Limite 30%" />
              <div
                className={`h-full transition-all duration-300 ${
                  metrics.isLifeAlert ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(metrics.lifeRatio, 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* 3. DEUX IMMENSES BOUTONS OCCUPANT LA LARGEUR DE L'ÉCRAN */}
        <section className="space-y-3 pt-1">
          {/* BOUTON VERT : J'AI VENDU (ENTRÉE) */}
          <button
            onClick={() => handleOpenModal('IN')}
            className="w-full min-h-[76px] py-4 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-neutral-950 font-black text-xl sm:text-2xl flex items-center justify-between transition-transform shadow-xl shadow-emerald-950/40 border-2 border-emerald-400 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center text-neutral-950 shrink-0">
                <TrendingUp className="w-7 h-7 stroke-[3]" />
              </div>
              <div className="text-left">
                <span className="block leading-tight tracking-tight">J'AI VENDU</span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-950/80">
                  Entrée d'argent
                </span>
              </div>
            </div>
            <span className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-2xl font-black">
              +
            </span>
          </button>

          {/* BOUTON ROUGE : J'AI DÉPENSÉ (SORTIE) */}
          <button
            onClick={() => handleOpenModal('OUT')}
            className="w-full min-h-[76px] py-4 px-6 rounded-3xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-xl sm:text-2xl flex items-center justify-between transition-transform shadow-xl shadow-red-950/40 border-2 border-red-400 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center text-white shrink-0">
                <TrendingDown className="w-7 h-7 stroke-[3]" />
              </div>
              <div className="text-left">
                <span className="block leading-tight tracking-tight">J'AI DÉPENSÉ</span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-red-200">
                  Sortie d'argent
                </span>
              </div>
            </div>
            <span className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-2xl font-black">
              -
            </span>
          </button>
        </section>

        {/* 4. LISTE DES 5 DERNIÈRES TRANSACTIONS */}
        <section className="pt-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">
              5 Dernières Opérations
            </h3>
            <span className="text-xs text-neutral-400 font-semibold font-mono">
              Total {transactions.length}
            </span>
          </div>

          {latestFive.length === 0 ? (
            <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-2">
              <p className="text-base font-extrabold text-neutral-300">
                Aucune transaction pour le moment
              </p>
              <p className="text-xs text-neutral-400">
                Tapez sur <strong className="text-emerald-400">J'ai vendu</strong> ou{' '}
                <strong className="text-red-400">J'ai dépensé</strong> pour enregistrer votre journée.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {latestFive.map((tx) => {
                const isEntry = tx.type === 'IN';
                return (
                  <div
                    key={tx.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isHighSunlight
                        ? 'bg-neutral-900 border-neutral-700'
                        : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black ${
                          isEntry
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : tx.category === 'LIFE'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {isEntry ? (
                          <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                        ) : tx.category === 'LIFE' ? (
                          <Home className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <Package className="w-5 h-5 stroke-[2.5]" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-white leading-tight">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <span
                            className={`font-black uppercase tracking-wider ${
                              isEntry
                                ? 'text-emerald-400'
                                : tx.category === 'LIFE'
                                ? 'text-amber-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {tx.category === 'SALE'
                              ? 'Vente'
                              : tx.category === 'LIFE'
                              ? 'Vie perso'
                              : 'Stock/Réinv.'}
                          </span>
                          <span>·</span>
                          <span>
                            {new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-black font-mono tabular-nums tracking-tight ${
                          isEntry ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isEntry ? '+' : '-'} {formatMoney(tx.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        title="Supprimer la transaction"
                        className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 5. TESTS ET CONTRÔLE RAPIDE DU COMMERÇANT */}
        <section className="pt-4 border-t border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-semibold px-1">
            <span>Actions rapides de test :</span>
            <button
              onClick={handleResetDemo}
              className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser Démo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSeedAlertScenario}
              className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Simuler Alerte (+40k LIFE)
            </button>
            <button
              onClick={() => {
                const saleTx: Transaction = {
                  id: `tx-${Date.now()}`,
                  amount: 50000,
                  type: 'IN',
                  category: 'SALE',
                  description: 'Gros encaissement client',
                  createdAt: new Date().toISOString(),
                };
                setTransactions((prev) => [saleTx, ...prev]);
                playSound('sale', soundEnabled);
              }}
              className="px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Simuler Vente (+50k)
            </button>
          </div>
        </section>

      </main>

      {/* MODAL RAPIDE DE SAISIE DE TRANSACTION (BAS DE L'ÉCRAN / BOTTOM SHEET ERGONOMIQUE) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-neutral-900 border-t sm:border border-neutral-700 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4">
            
            {/* EN-TÊTE MODAL */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    activeModal === 'IN' ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <h4 className="text-lg font-black tracking-tight text-white">
                  {activeModal === 'IN' ? "Enregistrer une Vente (Entrée)" : "Enregistrer une Dépense (Sortie)"}
                </h4>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SÉLECTEUR DE CATÉGORIE SI DÉPENSE */}
            {activeModal === 'OUT' && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                  Type de dépense
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setFormCategory('LIFE');
                    }}
                    className={`p-3 rounded-2xl border-2 text-left font-bold text-xs transition-all cursor-pointer ${
                      formCategory === 'LIFE'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-amber-400" />
                      <span className="font-black text-sm">Vie Perso (LIFE)</span>
                    </div>
                    <span className="text-[10px] block mt-1 text-neutral-400 font-normal">
                      Maison, famille, popote, sorties
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setFormCategory('REINVESTMENT');
                    }}
                    className={`p-3 rounded-2xl border-2 text-left font-bold text-xs transition-all cursor-pointer ${
                      formCategory === 'REINVESTMENT'
                        ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-400" />
                      <span className="font-black text-sm">Stock (RÉINVEST.)</span>
                    </div>
                    <span className="text-[10px] block mt-1 text-neutral-400 font-normal">
                      Marchandises, transport stock
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* CHAMP MONTANT ULTRA-CONTRASTÉ */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Montant ({currency})</span>
                {formAmount && (
                  <span className="font-mono text-emerald-400">
                    {formatMoney(parseInt(formAmount || '0', 10))}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full bg-neutral-950 border-2 border-neutral-700 focus:border-emerald-400 rounded-2xl px-4 py-4 text-3xl font-black font-mono text-white placeholder-neutral-700 focus:outline-none tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-neutral-400">
                  {currency}
                </span>
              </div>
            </div>

            {/* RACCOURCIS DE MONTANTS (FACILITÉ COMMERCE AFRICAIN) */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Ajout rapide :
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1000, 2000, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAddPreset(val)}
                    className="py-2 px-1 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-xs font-mono font-bold text-neutral-200 active:scale-95 transition-transform cursor-pointer"
                  >
                    +{val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>
            </div>

            {/* DESCRIPTION / MOTIF RAPIDE */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                Motif (optionnel)
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={
                  activeModal === 'IN'
                    ? 'Ex: Vente pagne, commande WhatsApp, jus...'
                    : formCategory === 'LIFE'
                    ? 'Ex: Popote du jour, crédit appel, santé...'
                    : 'Ex: Achat tissu gros, facture livraison...'
                }
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-medium text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>

            {/* BOUTON DE CONFIRMATION GÉANT */}
            <button
              onClick={() => handleSubmitTransaction()}
              disabled={!formAmount || parseInt(formAmount, 10) <= 0}
              className={`w-full min-h-[58px] rounded-2xl font-black text-xl flex items-center justify-center gap-2 transition-transform cursor-pointer shadow-xl ${
                activeModal === 'IN'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black active:scale-[0.98]'
                  : 'bg-red-500 hover:bg-red-400 text-white active:scale-[0.98]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {activeModal === 'IN' ? (
                <>
                  <Check className="w-6 h-6 stroke-[3]" />
                  VALIDER L'ENTRÉE
                </>
              ) : (
                <>
                  <Check className="w-6 h-6 stroke-[3]" />
                  VALIDER LA SORTIE
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL INSPECTEUR DE CODE : AFFICHE ET PERMET DE COPIER LES FICHIERS NEXT.JS ET PRISMA */}
      {viewCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-3xl max-h-[90vh] bg-neutral-950 border border-neutral-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            
            {/* TOP BAR MODAL */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h4 className="text-base font-black text-white">
                  Fichiers Next.js 14 & Prisma générés
                </h4>
              </div>
              <button
                onClick={() => setViewCodeModal(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* ONGLETS FICHIERS */}
            <div className="flex border-b border-neutral-800 bg-neutral-950 px-4 pt-2 gap-2 overflow-x-auto">
              {[
                { id: 'summary', label: 'Vue d\'ensemble' },
                { id: 'prisma', label: 'schema.prisma' },
                { id: 'actions', label: 'app/actions.ts' },
                { id: 'page', label: 'app/page.tsx' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setViewCodeModal(tab.id)}
                  className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-colors cursor-pointer whitespace-nowrap ${
                    viewCodeModal === tab.id
                      ? 'bg-neutral-900 text-emerald-400 border-t-2 border-emerald-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* CONTENU ONGLETS */}
            <div className="p-4 overflow-y-auto font-mono text-xs text-neutral-300 space-y-4 flex-1 bg-neutral-950">
              {viewCodeModal === 'summary' && (
                <div className="font-sans space-y-4 text-sm text-neutral-300">
                  <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <h5 className="text-base font-black text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Architecture Finance-MGS (Next.js 14 + Prisma SQLite)
                    </h5>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      L'application a été conçue pour éliminer la complexité des tableurs Excel sur smartphone.
                      Chaque fichier demandé est prêt pour le déploiement en production ou développement local.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-400">1. schema.prisma</span>
                      <p className="text-xs text-neutral-400">
                        Modèles <strong>User</strong> et <strong>Transaction</strong> avec SQLite,
                        Enums <code>IN/OUT</code> et <code>SALE/LIFE/REINVESTMENT</code>.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-400">2. app/actions.ts</span>
                      <p className="text-xs text-neutral-400">
                        Server Actions pour ajouter des transactions, calculer le bénéfice réel et la règle d'alerte des 30%.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1">
                      <span className="text-xs font-mono font-bold text-emerald-400">3. app/page.tsx</span>
                      <p className="text-xs text-neutral-400">
                        Dashboard Mobile avec carte Bénéfice Réel, les deux immenses boutons et la liste des 5 dernières opérations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {viewCodeModal === 'prisma' && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-neutral-400 font-sans font-bold">Fichier : prisma/schema.prisma</span>
                    <button
                      onClick={() => handleCopyCode('prisma', schemaPrismaContent)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-sans font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'prisma' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'prisma' ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-x-auto text-emerald-300">
                    {schemaPrismaContent}
                  </pre>
                </div>
              )}

              {viewCodeModal === 'actions' && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-neutral-400 font-sans font-bold">Fichier : app/actions.ts</span>
                    <button
                      onClick={() => handleCopyCode('actions', actionsCodeContent)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-sans font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'actions' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'actions' ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-x-auto text-sky-300">
                    {actionsCodeContent}
                  </pre>
                </div>
              )}

              {viewCodeModal === 'page' && (
                <div className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-neutral-400 font-sans font-bold">Fichier : app/page.tsx (Dashboard Mobile)</span>
                    <button
                      onClick={() => handleCopyCode('page', '/* Contenu complet disponible dans app/page.tsx */')}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-sans font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'page' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'page' ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400 font-sans mb-2">
                    Le fichier <code>app/page.tsx</code> complet a été généré et se trouve dans le projet. Vous pouvez également le voir dans la réponse ci-dessous.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-900 border-t border-neutral-800 text-center">
              <span className="text-xs text-neutral-400 font-sans">
                Finance-MGS · Développé avec Next.js 14, Tailwind CSS et Prisma
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
