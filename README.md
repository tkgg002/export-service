# Export Service

Clone theo auth-service pattern. Cung cấp export cho Payment Gateway và E-wallet, dùng MariaDB (Sequelize) và Storage Gateway để sinh Excel.

## Cấu trúc thư mục

- configs/moleculer.config.js
- svc-env.js
- dbHandler/mariadb.js
- middlewares/
- models/
- logics/
- publish/
- connectors/
- constants/
- start.js
- .run.local.env

## Yêu cầu môi trường

- Node.js >= 20
- MariaDB đang chạy và cấu hình trong `.run.local.env`
- Storage Gateway service khả dụng (tên service trong `.run.local.env`)

## Cài đặt

```bash
npm install
```

## Chạy local

```bash
npm run local
```

Mặc định dùng cấu hình trong `.run.local.env`.

## Endpoints/Actions chính

- export-service.healthCheck
- export-service.exportPaymentBills
- export-service.exportListTransHis

## Ví dụ gọi thử (Moleculer REPL)

```bash
$ moleculer REPL
> call export-service.healthCheck
> call export-service.exportPaymentBills --params '{"dateFr":"2024-01-01","dateTo":"2024-01-31","langCode":"vi"}'
> call export-service.exportListTransHis --params '{"dateFr":"2024-01-01","dateTo":"2024-01-31","langCode":"vi"}'
```

## Môi trường (.run.local.env)

- MariaDB
  - DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
- Storage Gateway
  - STORAGE_GATEWAY_SERVICE
- Giới hạn export
  - MAX_BATCH_SIZE, MAX_EXPORT_DAYS

## Ghi chú

- Models sử dụng Sequelize, có thể mở rộng index/migration nếu cần.
- Logic export đang gọi Storage Gateway qua `connectors/storage-gateway.connector.js`.
