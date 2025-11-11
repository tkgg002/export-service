const config = {
    enabled: true,
    fileName: 'New_Export',
    sheetName: 'Dữ liệu',
    cacheTTL: 3600,
    useWorker: false,
    dataAccess: '../../data-access/your-dao',
    columns: (lang = 'vi') => ['Cột 1', 'Cột 2', 'Cột 3'],
    defaultFilters: {},
    transform: (row) => row,
};
export default config;
//# sourceMappingURL=template.js.map