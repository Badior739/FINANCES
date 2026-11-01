'use server';

import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient pour éviter les connexions multiples en dev Next.js
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type TransactionType = 'IN' | 'OUT';
export type TransactionCategory = 'SALE' | 'LIFE' | 'REINVESTMENT';

export interface AddTransactionInput {
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description?: string;
  userId?: string;
}

/**
 * Assure qu'un utilisateur commerçant par défaut existe dans la base SQLite
 */
export async function getOrCreateDefaultUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Commerçant MGS',
        phone: '+225 07000000',
        currency: 'FCFA',
      },
    });
  }
  return user;
}

/**
 * Server Action : Ajout d'une transaction (Entrée ou Sortie)
 * Accepte FormData (Next.js Form Action) ou objet typé.
 */
export async function addTransaction(data: FormData | AddTransactionInput) {
  try {
    let amount: number;
    let type: TransactionType;
    let category: TransactionCategory;
    let description: string | undefined;

    if (data instanceof FormData) {
      const rawAmount = data.get('amount')?.toString() ?? '0';
      amount = Math.abs(parseInt(rawAmount.replace(/\D/g, ''), 10));
      type = (data.get('type')?.toString() as TransactionType) || 'IN';
      category = (data.get('category')?.toString() as TransactionCategory) || (type === 'IN' ? 'SALE' : 'LIFE');
      description = data.get('description')?.toString() || undefined;
    } else {
      amount = Math.abs(Math.round(data.amount));
      type = data.type;
      category = data.category;
      description = data.description;
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Le montant doit être supérieur à 0.' };
    }

    if (!['IN', 'OUT'].includes(type)) {
      return { success: false, error: 'Type de transaction invalide.' };
    }

    if (!['SALE', 'LIFE', 'REINVESTMENT'].includes(category)) {
      return { success: false, error: 'Catégorie invalide.' };
    }

    const defaultUser = await getOrCreateDefaultUser();

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type,
        category,
        description: description?.trim() || null,
        userId: defaultUser.id,
      },
    });

    revalidatePath('/');
    return { success: true, transaction };
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la transaction :', error);
    return { success: false, error: 'Impossible d\'enregistrer la transaction.' };
  }
}

/**
 * Récupère les données consolidées du Dashboard pour le mois en cours
 */
export async function getDashboardData() {
  const user = await getOrCreateDefaultUser();

  // Début du mois courant à 00:00:00.000
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  // Transactions du mois en cours
  const monthTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: startOfMonth,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculs trésorerie du mois
  let totalIn = 0;
  let totalOut = 0;
  let totalSale = 0;
  let totalLife = 0;
  let totalReinvestment = 0;

  for (const tx of monthTransactions) {
    if (tx.type === 'IN') {
      totalIn += tx.amount;
      if (tx.category === 'SALE') {
        totalSale += tx.amount;
      }
    } else if (tx.type === 'OUT') {
      totalOut += tx.amount;
      if (tx.category === 'LIFE') {
        totalLife += tx.amount;
      } else if (tx.category === 'REINVESTMENT') {
        totalReinvestment += tx.amount;
      }
    }
  }

  const realBenefit = totalIn - totalOut;

  // Logique d'alerte : Dépenses perso (LIFE) > 30% des ventes (SALE)
  const lifeLimitThreshold = totalSale * 0.3;
  const isLifeAlert = totalSale > 0 ? totalLife > lifeLimitThreshold : totalLife > 0;
  const lifeRatio = totalSale > 0 ? (totalLife / totalSale) * 100 : (totalLife > 0 ? 100 : 0);

  // 5 dernières transactions globales
  const latestTransactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  return {
    user,
    totalIn,
    totalOut,
    realBenefit,
    totalSale,
    totalLife,
    totalReinvestment,
    isLifeAlert,
    lifeRatio: Math.round(lifeRatio * 10) / 10,
    lifeLimitThreshold: Math.round(lifeLimitThreshold),
    latestTransactions,
  };
}

/**
 * Supprimer une transaction
 */
export async function deleteTransaction(transactionId: string) {
  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Erreur suppression transaction :', error);
    return { success: false, error: 'Impossible de supprimer.' };
  }
}
