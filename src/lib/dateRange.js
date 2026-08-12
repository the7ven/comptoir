// Calcule la plage de dates [start, end] (ISO) pour une période "day" /
// "week" / "month" / "year" ancrée sur `selectedDateISO`. Centralise le
// calcul identique répété dans OverviewTabContent (dashboard),
// ExpensesTabContent et CashierTabContent.
//
// "week" est la semaine calendaire dimanche->samedi contenant la date
// sélectionnée. C'est différent du "hebdomadaire" de ReportsTabContent
// (fenêtre glissante de 7 jours se terminant à la date sélectionnée) —
// volontairement pas unifié ici, ce sont deux définitions différentes.
export function getPeriodRange(period, selectedDateISO) {
  const date = new Date(selectedDateISO);

  if (period === "day") {
    return {
      start: `${selectedDateISO}T00:00:00.000Z`,
      end: `${selectedDateISO}T23:59:59.999Z`,
    };
  }
  if (period === "week") {
    const first = date.getDate() - date.getDay();
    const last = first + 6;
    return {
      start: new Date(date.setDate(first)).toISOString().split('T')[0] + "T00:00:00.000Z",
      end: new Date(date.setDate(last)).toISOString().split('T')[0] + "T23:59:59.999Z",
    };
  }
  if (period === "month") {
    return {
      start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }
  // year
  return {
    start: new Date(date.getFullYear(), 0, 1).toISOString(),
    end: new Date(date.getFullYear(), 11, 31, 23, 59, 59).toISOString(),
  };
}
