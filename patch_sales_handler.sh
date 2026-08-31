sed -i 's/totalAmountLe: totalAmount,/totalAmountLe: totalAmount,\n      actualCashCollected: vanActualCash,\n      shortfall: vanActualCash - totalAmount,/g' src/components/sales/SalesDailyRecordsModule.tsx

sed -i 's/totalAmountLe: totalAmount,/totalAmountLe: totalAmount,\n      actualCashCollected: triActualCash,\n      shortfall: triActualCash - totalAmount,/g' src/components/sales/SalesDailyRecordsModule.tsx

