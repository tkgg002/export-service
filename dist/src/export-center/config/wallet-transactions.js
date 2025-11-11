const config = {
    enabled: true,
    fileName: 'Lich_Su_Vi',
    sheetName: 'Lịch sử ví',
    cacheTTL: 3600,
    useWorker: false,
    dataAccess: '../../data-access/wallet-transactions.mongo',
    columns: (lang = 'vi') => ['ID', 'User ID', 'Loại', 'Số tiền', 'Thời gian', 'Mô tả'],
    defaultFilters: { type: { $in: ['topup', 'withdraw'] } },
};
export default config;
//# sourceMappingURL=wallet-transactions.js.map