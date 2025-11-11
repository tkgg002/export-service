import type { ExportConfigFromFile } from '../../types/export-center.d.ts';

const config: ExportConfigFromFile = {
  enabled: true,
  fileName: 'New_Export',
  sheetName: 'Dữ liệu',
  cacheTTL: 3600,
  useWorker: false,

  dataAccess: '../../data-access/your-dao',

  columns: (lang: string = 'vi') => ['Cột 1', 'Cột 2', 'Cột 3'],

  defaultFilters: {},

  transform: (row: any) => row,
};

export default config;