import { getDashboardData, addTransaction } from './actions';
import { revalidatePath } from 'next/cache';

// Formateur de devise FCFA / monétaire clair avec séparateurs de milliers
function formatMoney(amount: number, currency = 'FCFA'): string {
  const formatted = new Intl.NumberFormat('fr-FR').format(Math.abs(amount));
  return `${formatted} ${currency}`;
}

// Formatage lisible de l'heure et date
function formatTxDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (isToday) {
    return `Aujourd'hui à ${hours}:${minutes}`;
  }
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${hours}:${minutes}`;
}

export default async function MobileDashboardPage() {
  const data = await getDashboardData();
  const {
    user,
    totalIn,
    totalOut,
    realBenefit,
    totalSale,
    totalLife,
    isLifeAlert,
    lifeRatio,
    lifeLimitThreshold,
    latestTransactions,
  } = data;

  const currency = user.currency || 'FCFA';
  const isPositive = realBenefit >= 0;

  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans antialiased pb-24 selection:bg-emerald-500 selection:text-black">
      {/* 1. TOP HEADER & PWA BRAND */}
      <header className="sticky top-0 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-neutral-950 flex items-center justify-center font-black text-lg">
            F
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            Finance-MGS
          </span>
        </div>
        <span className="text-xs font-semibold text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800">
          {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()}
        </span>
      </header>

      {/* CONTENEUR CENTRÉ MOBILE PLEIN SOLEIL (Max 520px) */}
      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">

        {/* 2. LOGIQUE D'ALERTE : DÉPENSES PERSO (LIFE) > 30% DES VENTES (SALE) */}
        {isLifeAlert && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-amber-500 text-neutral-950 font-bold border-2 border-amber-300 shadow-xl shadow-amber-500/20 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">⚠️</span>
              <div className="flex-1 space-y-1">
                <p className="text-base font-black leading-tight uppercase tracking-wide">
                  Alerte Trésorerie Dépassée !
                </p>
                <p className="text-sm font-semibold leading-snug">
                  Vos dépenses personnelles (LIFE : <span className="font-mono">{formatMoney(totalLife, currency)}</span>)
                  représentent <span className="font-mono underline">{lifeRatio}%</span> de vos ventes ({formatMoney(totalSale, currency)}).
                </p>
                <p className="text-xs font-bold bg-amber-600/30 px-2 py-1 rounded inline-block text-neutral-900 mt-1">
                  Plafond max recommandé (30%) : {formatMoney(lifeLimitThreshold, currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. CARTE HAUTE VISIBILITÉ : BÉNÉFICE RÉEL DU MOIS */}
        <section
          aria-label="Bénéfice Réel du Mois"
          className={`p-6 rounded-3xl border-2 transition-all shadow-2xl ${
            isPositive
              ? 'bg-neutral-900 border-emerald-500/60 shadow-emerald-950/40'
              : 'bg-neutral-900 border-red-500/60 shadow-red-950/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
              Bénéfice Réel du Mois
            </span>
            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
              isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isPositive ? 'EN POSITIF' : 'DÉFICIT'}
            </span>
          </div>

          {/* GROS MONTANT LISIBLE EN PLEIN SOLEIL */}
          <div className="my-2">
            <div
              className={`text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums break-words ${
                isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isPositive ? '+' : '-'} {formatMoney(realBenefit, currency)}
            </div>
          </div>

          {/* DÉCOMPTE CLAIR : ENTRÉES VS SORTIES */}
          <div className="grid grid-cols-2 gap-3 pt-4 mt-3 border-t border-neutral-800 text-sm">
            <div>
              <span className="text-xs text-neutral-400 font-semibold block">Total Vendu (IN)</span>
              <span className="text-base font-bold text-emerald-400 font-mono tabular-nums">
                +{formatMoney(totalIn, currency)}
              </span>
            </div>
            <div>
              <span className="text-xs text-neutral-400 font-semibold block">Total Dépensé (OUT)</span>
              <span className="text-base font-bold text-red-400 font-mono tabular-nums">
                -{formatMoney(totalOut, currency)}
              </span>
            </div>
          </div>
        </section>

        {/* 4. DEUX IMMENSES BOUTONS OCCUPANT LA LARGEUR DE L'ÉCRAN */}
        <section className="space-y-3 pt-2">
          {/* BOUTON VERT : J'AI VENDU (ENTRÉE) */}
          <form action={async (formData) => {
            'use server';
            await addTransaction(formData);
            revalidatePath('/');
          }}>
            <input type="hidden" name="type" value="IN" />
            <input type="hidden" name="category" value="SALE" />
            
            {/* Modal de saisie rapide ou formulaire immédiat */}
            <div className="bg-neutral-900 border-2 border-emerald-500 rounded-3xl p-4 space-y-3 shadow-lg shadow-emerald-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">
                  Nouvelle Entrée
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">Boutique / Vente</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  name="amount"
                  placeholder="Montant FCFA (ex: 5000)"
                  required
                  min="1"
                  className="w-full bg-neutral-950 border-2 border-emerald-500/50 focus:border-emerald-400 rounded-2xl px-4 py-3.5 text-xl font-bold font-mono text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>
              <input
                type="text"
                name="description"
                placeholder="Motif (optionnel : pagne, jus, pain...)"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full min-h-[64px] bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-neutral-950 text-xl font-black rounded-2xl flex items-center justify-center gap-3 transition-transform shadow-lg cursor-pointer"
              >
                <span className="text-2xl">↗</span>
                J'AI VENDU (ENTRÉE)
              </button>
            </div>
          </form>

          {/* BOUTON ROUGE : J'AI DÉPENSÉ (SORTIE) */}
          <form action={async (formData) => {
            'use server';
            await addTransaction(formData);
            revalidatePath('/');
          }}>
            <input type="hidden" name="type" value="OUT" />

            <div className="bg-neutral-900 border-2 border-red-500 rounded-3xl p-4 space-y-3 shadow-lg shadow-red-950/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-red-400 uppercase">
                  Nouvelle Sortie
                </span>
                <div className="flex gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 has-[:checked]:border-red-400 has-[:checked]:text-red-400">
                    <input type="radio" name="category" value="LIFE" defaultChecked className="accent-red-500" />
                    <span className="font-bold">Vie perso (LIFE)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 has-[:checked]:border-blue-400 has-[:checked]:text-blue-400">
                    <input type="radio" name="category" value="REINVESTMENT" className="accent-blue-500" />
                    <span className="font-bold">Stock (RÉINVEST.)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  name="amount"
                  placeholder="Montant FCFA (ex: 2000)"
                  required
                  min="1"
                  className="w-full bg-neutral-950 border-2 border-red-500/50 focus:border-red-400 rounded-2xl px-4 py-3.5 text-xl font-bold font-mono text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>

              <input
                type="text"
                name="description"
                placeholder="Motif (ex: popote, transport, riz...)"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-700 rounded-xl px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none"
              />

              <button
                type="submit"
                className="w-full min-h-[64px] bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white text-xl font-black rounded-2xl flex items-center justify-center gap-3 transition-transform shadow-lg cursor-pointer"
              >
                <span className="text-2xl">↘</span>
                J'AI DÉPENSÉ (SORTIE)
              </button>
            </div>
          </form>
        </section>

        {/* 5. LISTE DES 5 DERNIÈRES TRANSACTIONS */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-neutral-400 uppercase tracking-wider">
              5 Dernières Opérations
            </h2>
            <span className="text-xs text-neutral-400">
              {latestTransactions.length} transaction{latestTransactions.length > 1 ? 's' : ''}
            </span>
          </div>

          {latestTransactions.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-neutral-400">
              <p className="text-base font-semibold">Aucune transaction enregistrée</p>
              <p className="text-xs text-neutral-400 mt-1">
                Appuyez sur un des deux boutons géants ci-dessus pour commencer.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {latestTransactions.map((tx) => {
                const isEntry = tx.type === 'IN';
                return (
                  <div
                    key={tx.id}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between transition-colors hover:border-neutral-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black shrink-0 ${
                          isEntry
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isEntry ? '↗' : '↘'}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-base font-extrabold text-white leading-tight">
                          {tx.description || (isEntry ? 'Vente boutique' : tx.category === 'LIFE' ? 'Dépense personnelle' : 'Achat stock')}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <span className={`font-semibold ${tx.category === 'LIFE' ? 'text-amber-400' : tx.category === 'REINVESTMENT' ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {tx.category === 'SALE' ? 'VENTE' : tx.category === 'LIFE' ? 'VIE PERSO' : 'STOCK'}
                          </span>
                          <span>·</span>
                          <span>{formatTxDate(tx.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-lg font-black font-mono tabular-nums block ${
                          isEntry ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {isEntry ? '+' : '-'}{formatMoney(tx.amount, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
