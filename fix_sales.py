with open('src/components/sales/SalesModule.tsx', 'r') as f:
    content = f.read()

target = """    if (timeframe === 'daily') {
      // Last 8 entries or daily dates
      return [...sales].slice(-8).map((s) => {
        const dayExpenses = expenses.filter((e) => e.date === s.date).reduce((acc, e) => acc + e.amountLe, 0);
        return {
          label: s.date.slice(5),
          fullDate: s.date,
          RevenueLe: s.totalAmountLe,
          ExpensesLe: dayExpenses,
          NetProfitLe: s.totalAmountLe - dayExpenses,
          BundlesSold: s.bundleQuantity,
          LossUnits: s.damagedLosses || (s.category === 'Damaged Bundles' ? s.bundleQuantity : 0),
        };
      });"""

replacement = """    if (timeframe === 'daily') {
      const dailyMap: Record<string, { revenue: number; expenses: number; sold: number; losses: number }> = {};
      sales.forEach((s) => {
        const dKey = s.date;
        if (!dailyMap[dKey]) dailyMap[dKey] = { revenue: 0, expenses: 0, sold: 0, losses: 0 };
        dailyMap[dKey].revenue += s.totalAmountLe;
        dailyMap[dKey].sold += s.bundleQuantity;
        dailyMap[dKey].losses += s.damagedLosses || (s.category === 'Damaged Bundles' ? s.bundleQuantity : 0);
      });
      expenses.forEach((e) => {
        const dKey = e.date;
        if (!dailyMap[dKey]) dailyMap[dKey] = { revenue: 0, expenses: 0, sold: 0, losses: 0 };
        dailyMap[dKey].expenses += e.amountLe;
      });
      return Object.entries(dailyMap).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8).map(([dateStr, data]) => ({
        label: dateStr.slice(5),
        fullDate: dateStr,
        RevenueLe: data.revenue,
        ExpensesLe: data.expenses,
        NetProfitLe: data.revenue - data.expenses,
        BundlesSold: data.sold,
        LossUnits: data.losses,
      }));"""

content = content.replace(target, replacement)

with open('src/components/sales/SalesModule.tsx', 'w') as f:
    f.write(content)
