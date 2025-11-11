import type { ExportConfigFromFile } from '../../types/export-center.d.ts';

const config: ExportConfigFromFile = {
  enabled: true,
  fileName: 'Lich_Su_Vi',
  sheetName: 'Lịch sử ví',
  cacheTTL: 3600,
  useWorker: false,

  dataAccess: '../../data-access/wallet-transactions.mongo',

  columns: (lang: string = 'vi') => ['ID', 'User ID', 'Loại', 'Số tiền', 'Thời gian', 'Mô tả'],

  defaultFilters: { type: { $in: ['topup', 'withdraw'] } },
};

export default config;