with open('src/components/sales/SalesDailyRecordsModule.tsx', 'r') as f:
    content = f.read()
import re
content = re.sub(r'      totalAmountLe: totalAmount,\n      actualCashCollected: triActualCash,\n      shortfall: triActualCash - totalAmount,\n      actualCashCollected: vanActualCash,\n      shortfall: vanActualCash - totalAmount,', r'      totalAmountLe: totalAmount,\n      actualCashCollected: vanActualCash,\n      shortfall: vanActualCash - totalAmount,', content)
with open('src/components/sales/SalesDailyRecordsModule.tsx', 'w') as f:
    f.write(content)
