# e-Learning Server

API backend cho hệ thống học từ vựng e-Learning. Người dùng đăng ký khoá học, học từ vựng theo
lesson và làm bài test trắc nghiệm. Admin quản lý khoá học và duyệt đăng ký.

Công nghệ: NestJS 11, TypeORM, PostgreSQL, Redis, JWT, nestjs-i18n (vi/en), Swagger.

## Tài liệu API

Swagger được sinh từ code, có ở `http://localhost:3000/docs` khi chạy local (tắt khi
`NODE_ENV=production`).

## Yêu cầu

- Node.js 24 (xem `.nvmrc`, dùng `nvm use`) và Yarn 1. Luôn cần trên máy cho git hook
  (lint-staged, commitlint) và editor, kể cả khi app chạy trong Docker.
- Chạy bằng Docker (khuyến nghị): Docker và Docker Compose v2 (Docker Desktop, OrbStack hoặc
  Colima). PostgreSQL 16, Redis 7 và Mailpit chạy trong container.
- Chạy trực tiếp: PostgreSQL 13+ (cần `gen_random_uuid()`) và Redis 6+.

## Chạy ở môi trường dev

Chuẩn bị chung:

```bash
nvm use
yarn install

cp .env.example .env
# Thay các giá trị change-me bằng chuỗi ngẫu nhiên: JWT_SECRET (tối thiểu 32 ký tự),
# POSTGRES_PASSWORD (Docker) và mật khẩu trong DATABASE_URL (chạy trực tiếp). Ví dụ:
#   openssl rand -hex 32
```

API chạy ở `http://localhost:3000/api/v1`. Khi khởi động, app kiểm tra biến môi trường và kết nối
Redis, nếu sai hoặc thiếu sẽ dừng ngay kèm thông báo lỗi.

### Cách 1: Docker (khuyến nghị)

```bash
docker compose up -d                      # app (watch mode) + PostgreSQL + Redis + Mailpit
docker compose exec app yarn db:migrate   # tạo bảng (lần đầu / khi có migration mới)
docker compose exec app yarn db:seed      # dữ liệu mẫu
docker compose logs -f app                # xem log

docker compose stop                       # tạm dừng
docker compose down                       # tắt và xoá container (giữ dữ liệu DB)
docker compose down -v                    # tắt và xoá cả dữ liệu DB
```

Mailpit (xem mail app gửi) ở `http://localhost:8025`.

Ghi chú:

- Repo không chứa mật khẩu: compose lấy `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` từ
  `.env` và dừng kèm thông báo nếu thiếu.
- Mật khẩu PostgreSQL chỉ được áp dụng khi volume dữ liệu được tạo lần đầu. Đổi mật khẩu sau đó
  thì cập nhật `.env` rồi chạy
  `docker compose exec postgres psql -U elearning -c "ALTER USER elearning PASSWORD '<mật khẩu mới>'"`
  và `docker compose up -d app`, hoặc xoá dữ liệu bằng `docker compose down -v`.
- Trong container, `DATABASE_URL` và `REDIS_URL` được compose ghép lại để trỏ tới service
  `postgres`, `redis`; giá trị trong `.env` (trỏ `localhost`) dùng cho lệnh chạy trên máy.
- Code được mount vào container nên sửa là app tự reload. Với Colima cần bật
  `colima start --mount-inotify`, nếu không thay đổi file không tới được container.
- `node_modules` trong container tách khỏi máy (bản Linux). Sau khi đổi `yarn.lock`, build lại và
  tạo lại volume: `docker compose up -d --build -V app`.
- Cổng trên máy đã bị dùng (ví dụ PostgreSQL / Redis cài sẵn) thì đổi bằng biến `APP_PORT`,
  `POSTGRES_PORT`, `REDIS_PORT`, `MAILPIT_SMTP_PORT`, `MAILPIT_UI_PORT` (có sẵn, đang comment
  trong `.env.example`), đặt trong `.env` hoặc trước lệnh, ví dụ
  `POSTGRES_PORT=5433 docker compose up -d`.

### Cách 2: chạy trực tiếp trên máy

Cần PostgreSQL và Redis đang chạy, `DATABASE_URL` / `REDIS_URL` trong `.env` trỏ tới chúng.

```bash
# Tạo database khớp với DATABASE_URL (nếu dùng PostgreSQL cài trên máy)
psql -d postgres -c "CREATE ROLE elearning LOGIN PASSWORD '<mật khẩu trong DATABASE_URL>'"
psql -d postgres -c "CREATE DATABASE elearning OWNER elearning"

yarn db:migrate
yarn db:seed
yarn start:dev
```

Có thể chỉ chạy PostgreSQL / Redis bằng Docker (`docker compose up -d postgres redis mailpit`) rồi
trỏ tới cổng mở ra trên máy trong `.env.local`, ví dụ
`DATABASE_URL=postgresql://elearning:<POSTGRES_PASSWORD>@localhost:5432/elearning` (đổi cổng nếu đã đặt
`POSTGRES_PORT`). Nhớ dừng service `app` trong compose nếu nó đang giữ cổng 3000.

### Tài khoản seed (chỉ dùng cho dev)

| Email                   | Mật khẩu     | Role    |
| ----------------------- | ------------ | ------- |
| `admin@elearning.local` | `Admin12345` | `admin` |
| `user1@elearning.local` | `User12345`  | `user`  |
| `user2@elearning.local` | `User12345`  | `user`  |
| `user3@elearning.local` | `User12345`  | `user`  |

### Health check

Nằm ngoài `API_PREFIX`, không cần token:

| Route               | Ý nghĩa                                                         |
| ------------------- | --------------------------------------------------------------- |
| `GET /health/live`  | Process còn chạy (Docker `HEALTHCHECK` dùng)                    |
| `GET /health/ready` | PostgreSQL và Redis trả lời; `503` kèm phần bị lỗi nếu không ổn |

## Chạy ở môi trường production

Biến môi trường production (ví dụ trong `.env.production`, không commit) cần ít nhất
`NODE_ENV=production`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`. Swagger tắt khi
`NODE_ENV=production`. Luôn chạy migration trước khi khởi động bản mới. Seed chỉ dùng cho dev.

### Cách 1: Docker (khuyến nghị)

```bash
docker build -t elearning-server .

# Migration
docker run --rm --env-file .env.production elearning-server yarn db:migrate:prod

# Chạy app
docker run -d --name elearning-api --restart unless-stopped \
  -p 3000:3000 --env-file .env.production elearning-server
```

Image chỉ chứa `dist/` và dependency runtime, chạy bằng user `node`, có `HEALTHCHECK` gọi
`/health/live`.

### Cách 2: chạy trực tiếp

```bash
nvm use
yarn install --frozen-lockfile
yarn build
NODE_ENV=production yarn db:migrate:prod   # migration từ dist/
NODE_ENV=production yarn start:prod        # node dist/main
```

Cần tự cài Node 24, PostgreSQL, Redis và dùng trình quản lý process (pm2, systemd...) để app tự
khởi động lại.

## Deploy lên VPS

Mỗi lần push `main`, sau khi CI trên commit đó pass, workflow `.github/workflows/release.yml` build
image `linux/amd64` từ đúng commit CI đã kiểm tra, đẩy lên GHCR (`ghcr.io/nampg-2632/elearning-server`, tag `sha-<7 ký tự>` và `latest`, giữ 5 bản gần nhất)
rồi SSH vào VPS chạy `deploy/deploy.sh`:

1. pull image mới;
2. bật Postgres, Redis;
3. chạy migration bằng image mới;
4. khởi động app mới, chờ `/health/ready`. Nếu không ready trong 90 giây thì bật lại image trước
   đó và job báo lỗi;
5. xoá image cũ trên VPS, chỉ giữ bản đang chạy và bản trước đó (để rollback).

Trên VPS (`/opt/elearning`) chạy `deploy/docker-compose.prod.yml`: app, PostgreSQL, Redis và Caddy
(HTTPS tự động). Chỉ Caddy mở cổng 80/443. File `.env` trên VPS được ghi lại mỗi lần deploy từ
secret của GitHub, không sửa tay.

Migration chạy trước khi bản mới khởi động và không bị revert khi rollback, nên phải tương thích
với bản đang chạy: thêm bảng/cột thì được, xoá hoặc đổi tên thì tách thành nhiều lần deploy.

### Chuẩn bị (làm một lần)

1. VPS Ubuntu 24.04, trỏ DNS (bản ghi `A`) của domain API về IP VPS.
2. Tạo key cho GitHub Actions trên máy mình:
   `ssh-keygen -t ed25519 -N "" -C github-actions-deploy -f ~/.ssh/elearning_deploy`
3. Chạy script chuẩn bị VPS (Docker, user `deploy`, firewall chỉ mở 22/80/443, swap, fail2ban,
   tự cập nhật bảo mật):

   ```bash
   scp scripts/setup-vps.sh root@<IP>:
   ssh root@<IP> "DEPLOY_PUBKEY='$(cat ~/.ssh/elearning_deploy.pub)' bash setup-vps.sh"
   ```

4. GitHub → Settings → Environments → tạo `prod` với các secret:

   | Secret              | Giá trị                                                            |
   | ------------------- | ------------------------------------------------------------------ |
   | `SSH_HOST`          | IP VPS                                                             |
   | `SSH_USER`          | `deploy`                                                           |
   | `SSH_PRIVATE_KEY`   | Nội dung `~/.ssh/elearning_deploy`                                 |
   | `SSH_KNOWN_HOSTS`   | Kết quả `ssh-keyscan <IP>`                                         |
   | `API_HOST`          | Domain API (HTTPS tự động); `http://<domain>` nếu chỉ muốn HTTP    |
   | `JWT_SECRET`        | `openssl rand -hex 32`                                             |
   | `POSTGRES_PASSWORD` | `openssl rand -hex 24`; chỉ áp dụng lần đầu tạo database           |
   | `CORS_ORIGINS`      | Origin của frontend, cách nhau bởi dấu phẩy (bỏ trống nếu chưa có) |

   Và các variable (tab **Environment variables**, không phải bí mật):

   | Variable        | Giá trị                                                     |
   | --------------- | ----------------------------------------------------------- |
   | `POSTGRES_USER` | User của database, ví dụ `elearning`                        |
   | `POSTGRES_DB`   | Tên database, ví dụ `elearning`; cả hai chỉ áp dụng lần đầu |

### Rollback và deploy lại

Actions → **Release** → **Run workflow**, nhập tag cũ (ví dụ `sha-1a2b3c4`, xem trong Packages)
để deploy lại image đó mà không build. Để trống tag thì build và deploy branch đang chọn.

### Thao tác trên VPS

`deploy.sh` ghi tag đang chạy vào `.env` (`IMAGE_TAG`), nên gõ `docker compose` trực tiếp được:

```bash
ssh deploy@<IP>
cd /opt/elearning
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### Tạo admin

Production không chạy seed nên không có sẵn admin. Đăng ký tài khoản qua
`POST /api/v1/auth/register` như user thường, rồi nâng quyền trên VPS:

```bash
echo "UPDATE users SET role = 'admin' WHERE lower(email) = lower('you@example.com');" |
  docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

`UPDATE 1` là xong. Quyền có hiệu lực ngay, không cần đăng nhập lại (role đọc từ DB mỗi request).

## Biến môi trường

| Biến                     | Mặc định      | Mô tả                                                |
| ------------------------ | ------------- | ---------------------------------------------------- |
| `NODE_ENV`               | `development` | `development` \| `test` \| `production`              |
| `PORT`                   | `3000`        |                                                      |
| `APP_NAME`, `APP_URL`    |               | Tên app (Swagger) và URL gốc                         |
| `API_PREFIX`             | `api/v1`      | Prefix cho mọi route                                 |
| `CORS_ORIGINS`           |               | Danh sách origin, cách nhau bởi dấu phẩy; rỗng = tắt |
| `FALLBACK_LANGUAGE`      | `vi`          | Ngôn ngữ mặc định (`vi` \| `en`)                     |
| `TRUST_PROXY`            | `0`           | Số reverse proxy phía trước (Caddy trên VPS = `1`)   |
| `DATABASE_URL`           | **bắt buộc**  | Chuỗi kết nối PostgreSQL                             |
| `DATABASE_POOL_MAX`      | `10`          |                                                      |
| `DATABASE_LOGGING`       | `false`       | Log câu SQL                                          |
| `REDIS_URL`              | **bắt buộc**  |                                                      |
| `REDIS_KEY_PREFIX`       | `elearning:`  | Prefix cho mọi key Redis                             |
| `JWT_SECRET`             | **bắt buộc**  | Khoá ký JWT (HS256), tối thiểu 32 ký tự              |
| `JWT_EXPIRES_IN_SECONDS` | `86400`       | Thời hạn access token                                |

Có thể ghi đè riêng cho máy mình bằng `.env.local` (được ưu tiên hơn `.env`).

## Scripts

Lệnh cần DB / Redis (`start:dev`, `db:*`) chạy trong container: `docker compose exec app yarn <lệnh>`.

| Lệnh                                | Mô tả                                         |
| ----------------------------------- | --------------------------------------------- |
| `yarn start:dev`                    | Chạy app, tự reload khi sửa code              |
| `yarn build` / `yarn start:prod`    | Build ra `dist/` và chạy bản build            |
| `yarn test` / `yarn test:cov`       | Unit test (`src/**/*.spec.ts`) / kèm coverage |
| `yarn lint` / `yarn lint:check`     | ESLint có sửa / chỉ kiểm tra                  |
| `yarn format` / `yarn format:check` | Prettier                                      |
| `yarn typecheck`                    | Kiểm tra kiểu TypeScript                      |
| `yarn db:migrate`                   | Chạy các migration chưa chạy                  |
| `yarn db:migrate:revert`            | Huỷ migration gần nhất                        |
| `yarn db:migrate:prod`              | Chạy migration từ `dist/` (trong image)       |
| `yarn db:migration:show`            | Xem trạng thái migration                      |
| `yarn db:migration:create <path>`   | Tạo file migration rỗng                       |
| `yarn db:seed`                      | Nạp dữ liệu mẫu                               |

## Cấu trúc thư mục

```
src/
  auth/          Đăng ký, đăng nhập, đăng xuất, JWT strategy và guard
  users/         Entity User, UsersService
  courses/       Course, CourseLesson
  lessons/       Lesson
  words/         Word, LessonWord
  tests/         Bài test: LessonTest, Question, QuestionOption, TestAttempt, AttemptAnswer
  enrollments/   Đăng ký khoá học (UserCourse)
  progress/      Tiến độ theo lesson (UserLesson)
  common/        Decorator (@Public, @Roles, @CurrentUser), guard, filter lỗi, phân trang, utils
  config/        Cấu hình theo nhóm và kiểm tra biến môi trường
  database/      Cấu hình TypeORM, migrations/, seeds/
  i18n/          Bản dịch vi/en (errors, validation)
  health/        /health/live, /health/ready
  redis/         Redis module/service dùng chung
```

## Quy ước

- **Auth:** mọi route cần `Authorization: Bearer <token>` trừ route có `@Public()`. Giới hạn
  quyền admin bằng `@Roles(UserRole.Admin)`. Đăng xuất đưa token vào blacklist trên Redis.
- **Ngôn ngữ:** chọn bằng `?lang=`, header `x-lang` hoặc `Accept-Language`; mặc định `vi`.
- **Lỗi:** mọi lỗi trả cùng format `{ statusCode, code, message, errors?, path, timestamp }`.
  Lỗi nghiệp vụ dùng `AppException` với `code` cố định và `message` lấy từ `src/i18n/*/errors.json`.
- **Database:** chỉ đổi schema qua migration (`synchronize` luôn tắt). Bảng và cột dùng
  `snake_case`, entity dùng `camelCase` (tự đổi bằng `SnakeNamingStrategy`).
- **Commit:** theo [Conventional Commits](https://www.conventionalcommits.org/), ví dụ
  `feat(auth): add login rate limit`. Husky chạy lint-staged (ESLint, Prettier) trước khi
  commit và commitlint kiểm tra commit message.

## CI

GitHub Actions (`.github/workflows/ci.yml`) chạy khi mở PR vào `main` và khi push `main`:

- **Lint, typecheck, test, build:** `lint:check`, `format:check`, `typecheck`, `test`, `build`.
- **Migrations and seed:** trên Postgres 16 sạch, chạy migrate → revert (schema phải trống) →
  migrate lại (schema phải giống lần đầu), rồi seed 2 lần (số dòng mỗi bảng không đổi).
- **Docker image:** build image production, chạy migration bằng image, khởi động app, chờ
  `/health/ready` rồi gọi thử đăng ký (kiểm tra `argon2` chạy được trong image).
- **Commit messages:** commitlint các commit trong PR.

Deploy chạy ở workflow riêng `release.yml`, chỉ bắt đầu khi CI trên `main` pass (CI lỗi hoặc bị huỷ
thì không deploy), xem [Deploy lên VPS](#deploy-lên-vps).
