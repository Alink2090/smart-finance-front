/**
 * useInsights — calcule des insights financiers à partir des données déjà chargées.
 * Ne fait AUCUN appel API supplémentaire, travaille sur les données existantes.
 *
 * Usage:
 *   const insights = useInsights({ stats, monthly, catExp, budgets })
 *
 * Retourne un tableau d'insights triés par priorité (error > warning > info > success)
 */

export function useInsights({ stats, monthly, catExp, budgets }) {
  const insights = []

  if (!stats && !monthly?.length && !catExp?.length && !budgets?.length) return insights

  // ── 1. Solde négatif ────────────────────────────────────────────────────────
  const balance = stats?.balance ?? 0
  const income  = stats?.total_income ?? 0
  const expenses = stats?.total_expenses ?? 0

  if (balance < 0) {
    insights.push({
      id: 'negative-balance',
      type: 'error',
      icon: '⚠',
      title: 'Solde négatif',
      message: `Vos dépenses dépassent vos revenus de ${fmt(Math.abs(balance))} ce mois-ci.`,
      action: null,
    })
  }

  // ── 2. Taux d'épargne ───────────────────────────────────────────────────────
  if (income > 0) {
    const savingsRate = ((income - expenses) / income) * 100
    if (savingsRate >= 20) {
      insights.push({
        id: 'good-savings',
        type: 'success',
        icon: '✓',
        title: 'Bon taux d\'épargne',
        message: `Vous épargnez ${savingsRate.toFixed(0)}% de vos revenus. Continuez ainsi !`,
        action: null,
      })
    } else if (savingsRate < 10 && savingsRate >= 0) {
      insights.push({
        id: 'low-savings',
        type: 'warning',
        icon: '↗',
        title: 'Épargne faible',
        message: `Taux d'épargne : ${savingsRate.toFixed(0)}%. L'objectif recommandé est 20%.`,
        action: null,
      })
    }
  }

  // ── 3. Budgets dépassés ─────────────────────────────────────────────────────
  if (budgets?.length) {
    const overBudgets = budgets.filter(b => (b.spent_amount ?? 0) > (b.limit_amount ?? 0))
    if (overBudgets.length > 0) {
      const names = overBudgets
        .slice(0, 2)
        .map(b => b.category?.name ?? `Budget #${b.id}`)
        .join(', ')
      insights.push({
        id: 'over-budget',
        type: 'error',
        icon: '⚠',
        title: `${overBudgets.length} budget${overBudgets.length > 1 ? 's' : ''} dépassé${overBudgets.length > 1 ? 's' : ''}`,
        message: `${names}${overBudgets.length > 2 ? ` et ${overBudgets.length - 2} autre(s)` : ''} ont dépassé leur limite.`,
        action: { label: 'Voir budgets', page: '/budgets' },
      })
    }

    // Budgets proches (>80%)
    const nearLimit = budgets.filter(b => {
      const pct = (b.limit_amount ?? 0) > 0 ? ((b.spent_amount ?? 0) / b.limit_amount) * 100 : 0
      return pct >= 80 && pct <= 100
    })
    if (nearLimit.length > 0) {
      insights.push({
        id: 'near-limit',
        type: 'warning',
        icon: '◎',
        title: `${nearLimit.length} budget${nearLimit.length > 1 ? 's' : ''} proche${nearLimit.length > 1 ? 's' : ''} de la limite`,
        message: nearLimit
          .slice(0, 2)
          .map(b => {
            const pct = Math.round(((b.spent_amount ?? 0) / (b.limit_amount ?? 1)) * 100)
            const name = b.category?.name ?? `Budget #${b.id}`
            return `${name} (${pct}%)`
          })
          .join(', '),
        action: { label: 'Voir budgets', page: '/budgets' },
      })
    }
  }

  // ── 4. Catégorie dominante ──────────────────────────────────────────────────
  if (catExp?.length && expenses > 0) {
    const sorted = [...catExp].sort((a, b) =>
      (b.amount ?? b.total ?? 0) - (a.amount ?? a.total ?? 0)
    )
    const top = sorted[0]
    const topAmt = top.amount ?? top.total ?? 0
    const topName = top.category?.name ?? top.category ?? top.name ?? '—'
    const pct = ((topAmt / expenses) * 100).toFixed(0)
    if (pct >= 40) {
      insights.push({
        id: 'top-category',
        type: 'info',
        icon: '↓',
        title: `${topName} représente ${pct}% de vos dépenses`,
        message: `${fmt(topAmt)} dépensés sur ${fmt(expenses)} au total.`,
        action: { label: 'Voir analytics', page: '/analytics' },
      })
    }
  }

  // ── 5. Prédiction fin de mois ───────────────────────────────────────────────
  const prediction = predictEndOfMonth({ income, expenses })
  if (prediction) {
    insights.push({
      id: 'prediction',
      type: prediction.type,
      icon: '→',
      title: 'Prédiction fin de mois',
      message: prediction.message,
      action: { label: 'Voir analytics', page: '/analytics' },
    })
  }

  // ── 6. Tendance (si données mensuelles dispo) ───────────────────────────────
  if (monthly?.length >= 2) {
    const last  = monthly[monthly.length - 1]
    const prev  = monthly[monthly.length - 2]
    const lastExp  = last.expenses  ?? last.expense  ?? 0
    const prevExp  = prev.expenses  ?? prev.expense  ?? 0
    if (prevExp > 0) {
      const delta = ((lastExp - prevExp) / prevExp) * 100
      if (delta > 20) {
        insights.push({
          id: 'expense-spike',
          type: 'warning',
          icon: '↑',
          title: `Dépenses en hausse de ${delta.toFixed(0)}%`,
          message: `Vous avez dépensé ${fmt(lastExp - prevExp)} de plus que le mois précédent.`,
          action: { label: 'Comparer', page: '/analytics' },
        })
      } else if (delta < -15) {
        insights.push({
          id: 'expense-drop',
          type: 'success',
          icon: '↓',
          title: `Dépenses en baisse de ${Math.abs(delta).toFixed(0)}%`,
          message: `Vous avez économisé ${fmt(prevExp - lastExp)} vs le mois précédent.`,
          action: null,
        })
      }
    }
  }

  // Trier par priorité
  const priority = { error: 0, warning: 1, info: 2, success: 3 }
  return insights.sort((a, b) => (priority[a.type] ?? 4) - (priority[b.type] ?? 4))
}

// ── Prédiction fin de mois ────────────────────────────────────────────────────
// Basée sur le jour courant du mois (ratio temporel simple)
export function predictEndOfMonth({ income, expenses }) {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfMonth  = today.getDate()
  const elapsed = dayOfMonth / daysInMonth

  if (elapsed < 0.1 || elapsed >= 1) return null // trop tôt ou fin de mois

  const projectedExpenses = expenses / elapsed
  const projectedBalance  = income - projectedExpenses

  if (projectedBalance < 0) {
    return {
      type: 'error',
      projected: projectedExpenses,
      balance: projectedBalance,
      message: `À ce rythme, vous dépasserez vos revenus de ${fmt(Math.abs(projectedBalance))} d'ici fin de mois.`,
    }
  }

  if (projectedExpenses > income * 0.9) {
    return {
      type: 'warning',
      projected: projectedExpenses,
      balance: projectedBalance,
      message: `Dépenses projetées : ${fmt(projectedExpenses)}. Il restera environ ${fmt(projectedBalance)}.`,
    }
  }

  return {
    type: 'info',
    projected: projectedExpenses,
    balance: projectedBalance,
    message: `Dépenses projetées en fin de mois : ${fmt(projectedExpenses)} (solde estimé : ${fmt(projectedBalance)}).`,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0) + ' FCFA'
}
