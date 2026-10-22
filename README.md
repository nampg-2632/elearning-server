# e-Learning Server

API backend cho hệ thống học từ vựng e-Learning. Người dùng đăng ký khoá học, học từ vựng theo
lesson và làm bài test trắc nghiệm. Admin quản lý khoá học và duyệt đăng ký.

Công nghệ: NestJS 11, TypeORM, PostgreSQL, Redis, JWT, nestjs-i18n (vi/en), Swagger.

## Tài liệu API

Swagger được sinh từ code, có ở `http://localhost:3000/docs` khi chạy local (tắt khi
`NODE_ENV=production`).

## Yêu cầu

- Node.js 20.19+ (xem `.nvmrc`, dùng `nvm use`) và Yarn 1.
- PostgreSQL 13+ (cần `gen_random_uuid()`).
- Redis 6+.

## Cài đặt và chạy local

```bash
nvm use
yarn install

# 1. Biến môi trường
cp .env.example .env
# Đặt JWT_SECRET là chuỗi ngẫu nhiên tối thiểu 32 ký tự, ví dụ:
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 2. Tạo database khớp với DATABASE_URL trong .env
psql -d postgres -c "CREATE ROLE elearning LOGIN PASSWORD 'elearning_dev'"
psql -d postgres -c "CREATE DATABASE elearning OWNER elearning"

# 3. Tạo bảng và dữ liệu mẫu
yarn db:migrate
yarn db:seed

# 4. Chạy ở chế độ watch
yarn start:dev
```

API chạy ở `http://localhost:3000/api/v1`. Khi khởi động, app kiểm tra biến môi trường và
kết nối Redis, nếu sai hoặc thiếu sẽ dừng ngay kèm thông báo lỗi.

### Tài khoản seed (chỉ dùng cho dev)

| Email                   | Mật khẩu     | Role    |
| ----------------------- | ------------ | ------- |
| `admin@elearning.local` | `Admin12345` | `admin` |
| `user1@elearning.local` | `User12345`  | `user`  |
| `user2@elearning.local` | `User12345`  | `user`  |
| `user3@elearning.local` | `User12345`  | `user`  |

## Biến môi trường

| Biến                     | Mặc định      | Mô tả                                                |
| ------------------------ | ------------- | ---------------------------------------------------- |
| `NODE_ENV`               | `development` | `development` \| `test` \| `production`              |
| `PORT`                   | `3000`        |                                                      |
| `APP_NAME`, `APP_URL`    |               | Tên app (Swagger) và URL gốc                         |
| `API_PREFIX`             | `api/v1`      | Prefix cho mọi route                                 |
| `CORS_ORIGINS`           |               | Danh sách origin, cách nhau bởi dấu phẩy; rỗng = tắt |
| `FALLBACK_LANGUAGE`      | `vi`          | Ngôn ngữ mặc định (`vi` \| `en`)                     |
| `DATABASE_URL`           | **bắt buộc**  | Chuỗi kết nối PostgreSQL                             |
| `DATABASE_POOL_MAX`      | `10`          |                                                      |
| `DATABASE_LOGGING`       | `false`       | Log câu SQL                                          |
| `REDIS_URL`              | **bắt buộc**  |                                                      |
| `REDIS_KEY_PREFIX`       | `elearning:`  | Prefix cho mọi key Redis                             |
| `JWT_SECRET`             | **bắt buộc**  | Khoá ký JWT (HS256), tối thiểu 32 ký tự              |
| `JWT_EXPIRES_IN_SECONDS` | `86400`       | Thời hạn access token                                |

Có thể ghi đè riêng cho máy mình bằng `.env.local` (được ưu tiên hơn `.env`).

## Scripts

| Lệnh                                | Mô tả                                         |
| ----------------------------------- | --------------------------------------------- |
| `yarn start:dev`                    | Chạy app, tự reload khi sửa code              |
| `yarn build` / `yarn start:prod`    | Build ra `dist/` và chạy bản build            |
| `yarn test` / `yarn test:cov`       | Unit test (`src/**/*.spec.ts`) / kèm coverage |
| `yarn test:e2e`                     | E2E test (`test/`), cần DB và Redis           |
| `yarn lint` / `yarn lint:check`     | ESLint có sửa / chỉ kiểm tra                  |
| `yarn format` / `yarn format:check` | Prettier                                      |
| `yarn typecheck`                    | Kiểm tra kiểu TypeScript                      |
| `yarn db:migrate`                   | Chạy các migration chưa chạy                  |
| `yarn db:migrate:revert`            | Huỷ migration gần nhất                        |
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
