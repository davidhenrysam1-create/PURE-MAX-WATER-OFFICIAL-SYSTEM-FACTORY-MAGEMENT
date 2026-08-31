with open('src/components/sales/SalesDailyRecordsModule.tsx', 'r') as f:
    content = f.read()

import re
content = re.sub(r'      actualCashCollected: vanActualCash,\n      shortfall: vanActualCash - totalAmount,\n      vehicleNumber: triVehicle', r'      actualCashCollected: triActualCash,\n      shortfall: triActualCash - totalAmount,\n      vehicleNumber: triVehicle', content)

with open('src/components/sales/SalesDailyRecordsModule.tsx', 'w') as f:
    f.write(content)
