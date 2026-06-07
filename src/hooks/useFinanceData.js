import { useMemo } from 'react'

/** Tous les calculs financiers utiles, mémoïsés */
export function useFinanceCalcs({ stats, monthly = [], catExp = [] }) {
  return useMemo(() => {
    const income   = stats?.total_income   ?? 0
    const expenses = stats?.total_expenses ?? 0
    const balance  = stats?.balance        ?? income - expenses

    // Taux d'épargne
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0

    // Ratio dépenses/revenus
    const expenseRatio = income > 0 ? (expenses / income) * 100 : 0

    // Moyenne mensuelle dépenses
    const avgMonthlyExpense = monthly.length > 0
      ? monthly.reduce((s, m) => s + (m.expenses ?? 0), 0) / monthly.length
      : 0

    // Moyenne mensuelle revenus
    const avgMonthlyIncome = monthly.length > 0
      ? monthly.reduce((s, m) => s + (m.income ?? 0), 0) / monthly.length
      : 0

    // Évolution vs mois précédent
    const curr = monthly[monthly.length - 1]
    const prev = monthly[monthly.length - 2]
    const expGrowth = prev && (prev.expenses ?? 0) > 0
      ? (((curr?.expenses ?? 0) - (prev?.expenses ?? 0)) / (prev?.expenses ?? 1)) * 100
      : null
    const incGrowth = prev && (prev.income ?? 0) > 0
      ? (((curr?.income ?? 0) - (prev?.income ?? 0)) / (prev?.income ?? 1)) * 100
      : null

    // Mois le plus dépensier
    const worstMonth = monthly.reduce(
      (max, m) => (m.expenses ?? 0) > (max.expenses ?? 0) ? m : max,
      monthly[0] ?? {}
    )

    // Top catégorie
    const totalCatExp = catExp.reduce((s, c) => s + (c.amount ?? c.total ?? 0), 0)
    const topCat = [...catExp].sort(
      (a, b) => (b.amount ?? b.total ?? 0) - (a.amount ?? a.total ?? 0)
    )[0]
    const topCatName   = topCat?.category?.name ?? topCat?.category ?? topCat?.name ?? null
    const topCatAmt    = topCat?.amount ?? topCat?.total ?? 0
    const topCatShare  = totalCatExp > 0 ? (topCatAmt / totalCatExp) * 100 : 0
    const topCatColor  = topCat?.category?.color ?? topCat?.color ?? '#7c6cfc'

    // Projection linéaire simple (régression sur les 3 derniers mois)
    const recentExp = monthly.slice(-3).map(m => m.expenses ?? 0)
    let projectedNextExpense = null
    if (recentExp.length >= 2) {
      const diffs = recentExp.slice(1).map((v, i) => v - recentExp[i])
      const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length
      projectedNextExpense = Math.max(0, recentExp[recentExp.length - 1] + avgDiff)
    }

    // Détection anomalie : dépense du mois courant > moyenne + 1.5 écart-type
    let anomaly = null
    if (monthly.length >= 3) {
      const vals   = monthly.slice(0, -1).map(m => m.expenses ?? 0)
      const mean   = vals.reduce((s, v) => s + v, 0) / vals.length
      const std    = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
      const lastEx = curr?.expenses ?? 0
      if (lastEx > mean + 1.5 * std) {
        anomaly = { month: curr?.month, amount: lastEx, mean, deviation: ((lastEx - mean) / mean) * 100 }
      }
    }

    // Données enrichies pour les charts (avec projection)
    const monthlyWithProjection = monthly.length > 0 && projectedNextExpense !== null
      ? [
          ...monthly,
          {
            month: 'Proj.',
            income: avgMonthlyIncome,
            expenses: projectedNextExpense,
            isProjection: true,
          },
        ]
      : monthly

    return {
      income, expenses, balance, savingsRate, expenseRatio,
      avgMonthlyExpense, avgMonthlyIncome,
      expGrowth, incGrowth,
      worstMonth, topCatName, topCatAmt, topCatShare, topCatColor, totalCatExp,
      projectedNextExpense, anomaly,
      monthlyWithProjection,
      curr, prev,
    }
  }, [stats, monthly, catExp])
}

/** Génère des insights automatiques à partir des données calculées */
export function generateInsights(calcs, budgets = []) {
  const insights = []
  const {
    income, expenses, savingsRate, expGrowth, topCatName, topCatShare,
    topCatAmt, anomaly, projectedNextExpense, avgMonthlyExpense,
    balance, expenseRatio,
  } = calcs

  // ── ALERTS ────────────────────────────────────────────────────────────────
  if (balance < 0) insights.push({
    id:'neg-balance', group:'alerts', priority:'high',
    icon:'⚠', color:'#f5476a', bg:'rgba(245,71,106,.1)',
    title:'Solde négatif',
    message:`Vos dépenses dépassent vos revenus de ${fmt(Math.abs(balance))} ce mois.`,
    action:'Réduire les dépenses non essentielles.',
  })

  if (anomaly) insights.push({
    id:'anomaly', group:'alerts', priority:'high',
    icon:'🔥', color:'#f5476a', bg:'rgba(245,71,106,.1)',
    title:'Dépense anormalement élevée',
    message:`${anomaly.month} : ${fmt(anomaly.amount)} (+${anomaly.deviation.toFixed(0)}% vs moyenne ${fmt(anomaly.mean)}).`,
    action:'Identifier et réduire la catégorie responsable.',
  })

  console.log(budgets)

  const isOverBudget = (b) => {
    const spent = b.spent_amount ?? 0

    if (b.budget_type === 'saving') return spent < 0
    return spent > (b.limit_amount ?? 0)
  }

  const overBudgets = budgets.filter(isOverBudget)
  if (overBudgets.length) insights.push({
    id:'over-budget', group:'alerts', priority:'high',
    icon:'⚠', color:'#f59e0b', bg:'rgba(245,158,11,.1)',
    title:`${overBudgets.length} budget${overBudgets.length > 1 ? 's' : ''} dépassé${overBudgets.length > 1 ? 's' : ''}`,
    message:overBudgets.slice(0,2).map(b => b.category?.name ?? `Budget #${b.name}`).join(', '),
    action:'Ajuster les limites ou réduire les dépenses.',
  })

  if (expGrowth !== null && expGrowth > 20) insights.push({
    id:'exp-spike', group:'alerts', priority:'medium',
    icon:'📈', color:'#f59e0b', bg:'rgba(245,158,11,.1)',
    title:`Dépenses en hausse de ${expGrowth.toFixed(0)}%`,
    message:`Augmentation significative par rapport au mois précédent.`,
    action:'Analyser les catégories en croissance.',
  })

  // ── OPPORTUNITIES ─────────────────────────────────────────────────────────
  if (savingsRate < 10 && income > 0) insights.push({
    id:'low-savings', group:'opportunities', priority:'medium',
    icon:'💡', color:'#38bdf8', bg:'rgba(56,189,248,.1)',
    title:`Taux d'épargne faible (${savingsRate.toFixed(0)}%)`,
    message:`L'objectif recommandé est 20%. Vous épargnez ${fmt(income - expenses)}/mois.`,
    action:'Automatisez un virement épargne dès réception du salaire.',
  })

  if (topCatShare > 40 && topCatName) insights.push({
    id:'top-cat-dominant', group:'opportunities', priority:'medium',
    icon:'💡', color:'#38bdf8', bg:'rgba(56,189,248,.1)',
    title:`${topCatName} concentre ${topCatShare.toFixed(0)}% des dépenses`,
    message:`${fmt(topCatAmt)} dépensés dans cette catégorie.`,
    action:`Établir un budget mensuel strict pour ${topCatName}.`,
  })

  if (expenseRatio > 90 && income > 0) insights.push({
    id:'high-ratio', group:'opportunities', priority:'medium',
    icon:'💡', color:'#38bdf8', bg:'rgba(56,189,248,.1)',
    title:`Ratio dépenses/revenus critique : ${expenseRatio.toFixed(0)}%`,
    message:'Moins de 10% de vos revenus restent disponibles.',
    action:'Identifiez 2-3 postes de dépenses réductibles.',
  })

  // ── TRENDS ────────────────────────────────────────────────────────────────
  if (projectedNextExpense !== null) {
    const delta = projectedNextExpense - avgMonthlyExpense
    const positive = projectedNextExpense > avgMonthlyExpense
    insights.push({
      id:'projection', group:'trends', priority:'low',
      icon: positive ? '📉' : '📈',
      color: positive ? '#f59e0b' : '#22d3a0',
      bg: positive ? 'rgba(245,158,11,.1)' : 'rgba(34,211,160,.1)',
      title:`Projection mois prochain : ${fmt(projectedNextExpense)}`,
      message: positive
        ? `En hausse de ${fmt(Math.abs(delta))} vs moyenne mensuelle.`
        : `En baisse de ${fmt(Math.abs(delta))} vs moyenne mensuelle.`,
      action: positive ? 'Anticiper et ajuster les budgets.' : 'Bonne trajectoire, continuez.',
    })
  }

  if (expGrowth !== null && expGrowth < -15) insights.push({
    id:'exp-down', group:'trends', priority:'low',
    icon:'📉', color:'#22d3a0', bg:'rgba(34,211,160,.1)',
    title:`Dépenses en baisse de ${Math.abs(expGrowth).toFixed(0)}%`,
    message:'Bonne maîtrise budgétaire ce mois-ci.',
    action:'Maintenez cette discipline et placez l\'excédent en épargne.',
  })

  if (savingsRate >= 20) insights.push({
    id:'good-savings', group:'trends', priority:'low',
    icon:'✦', color:'#22d3a0', bg:'rgba(34,211,160,.1)',
    title:`Excellent taux d'épargne : ${savingsRate.toFixed(0)}%`,
    message:`Vous épargnez ${fmt(income - expenses)} ce mois. Bien au-dessus des 20% recommandés.`,
    action:'Envisagez un placement (ETF, livret A, assurance-vie).',
  })

  // Tri par priorité
  const order = { high:0, medium:1, low:2 }
  return insights.sort((a,b) => (order[a.priority]??3) - (order[b.priority]??3))
}

const formatXOF = (n, digits = 0) =>
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(Number(n) || 0) + ' FCFA'

const fmt = n => formatXOF(n, 0)
