import path from 'path';
import { fileURLToPath } from 'url';
import PaymentBillsProcessor from '../processors/payment-bills-processor.ts';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbType = process.env.PAYMENT_BILLS_DB_TYPE || 'mongo';
const config = {
    enabled: true,
    fileName: 'Hoa_Don_Thanh_Toan',
    sheetName: 'Hóa đơn',
    cacheTTL: 1800,
    useWorker: true,
    dbType,
    dataAccess: path.join(__dirname, `../../../data-access/payment-bills.${dbType}.js`),
    processor: PaymentBillsProcessor,
    columns: (lang = 'vi') => (lang === 'vi'
        ? ['Mã HĐ', 'Thời gian', 'Merchant', 'Số tiền', 'Trạng thái', 'Kênh']
        : ['Bill ID', 'Time', 'Merchant', 'Amount', 'Status', 'Channel']),
    defaultFilters: { state: 'completed' },
    transform: (row, lang) => ({
        ...row,
        amount: row.amount / 100,
        time: new Date(row.time).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US'),
    }),
};
export default config;
//# sourceMappingURL=payment-bills.js.map