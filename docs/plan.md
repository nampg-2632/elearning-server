# Kế hoạch triển khai Phase 1

Tài liệu liên quan: [api-spec.md](api-spec.md), [database.md](database.md).

Nguyên tắc:

- Mỗi bước là một hoặc vài commit nhỏ (Conventional Commits, không có co-author).
- Làm xong bước nào thì báo cáo và chờ duyệt rồi mới sang bước sau.
- Không cài sẵn package hay module cho bước sau.

## Đã xong – Setup dự án

| Commit    | Nội dung                                                                  |
| --------- | ------------------------------------------------------------------------- |
| `eaf6d57` | Khởi tạo bằng `nest new` (Nest 11)                                        |
| `3a5b749` | ESLint, Prettier, `.editorconfig`, `.nvmrc`                               |
| `5150757` | Husky, lint-staged, commitlint                                            |
| `27308f3` | ConfigModule, kiểm tra biến môi trường khi khởi động                      |
| `34aabac` | nestjs-i18n vi/en                                                         |
| `db8cc74` | Prefix `API_PREFIX`, validation pipe, helmet, CORS, Swagger               |
| `1b02a53` | TypeORM + Postgres, script migration                                      |
| `a1ff90d` | Redis module/service                                                      |
| `0f59a1d` | Common: format lỗi chung, `AppException`, `@Public`, `@Roles`, phân trang |

## Đã chốt

- [x] **Trạng thái "đã học" của từ:** từ đã học = từ thuộc lesson mà user đã `pass` (suy ra từ
      `user_lessons`). `lesson_words` không có cột `status`.
- [x] **Gửi mail:** tạm thời không gửi mail. Approve/reject chỉ đổi trạng thái; mail chuyển sang
      mục "Để sau".
- [x] **Từ chối đăng ký:** từ chối được khi `pending` và **thu hồi được khi đã `approved`**.
      Bị thu hồi thì user mất quyền truy cập course (403), tiến độ `user_lessons` vẫn giữ nguyên.
- [x] **Bài test:** không giới hạn thời gian, không xáo trộn thứ tự đáp án (giữ theo `position`).
- [x] **Cache tiến độ:** Phase 1 không cache, tiến độ luôn tính trực tiếp bằng query. Cache Redis
      chuyển sang mục "Để sau".

`api-spec.md` và `database.md` đã được cập nhật theo các quyết định trên:

- Bỏ `tests.time_limit_seconds`, `expiresAt`, lỗi `ATTEMPT_EXPIRED`, việc xáo trộn đáp án.
- Bỏ mục "System – Gửi mail" và health check; ghi vào phần "Tạm hoãn".
- `PATCH /admin/user-courses/:id/reject` nhận cả `pending` (từ chối) lẫn `approved` (thu hồi).
- `lesson_words` không có cột `status`.

## Bước 0 – Việc lặt vặt

- [x] Viết lại README theo dự án (làm cùng commit auth `a3ea68d`).
- [ ] Xoá nhánh `backup/before-remove-docs` khi đã chắc lịch sử mới ổn.

## Bước 1 – Schema và seed dữ liệu

- [x] Migration toàn bộ bảng Phase 1: `users`, `courses`, `lessons`, `course_lessons`, `words`,
      `lesson_words`, `tests`, `questions`, `question_options`, `user_courses`, `user_lessons`,
      `test_attempts`, `attempt_answers`, kèm enum, index, trigger `updated_at`.
      Thêm ràng buộc: tối đa 1 đáp án đúng mỗi câu, tối đa 1 attempt `doing` mỗi user/test,
      cột kết quả của attempt bắt buộc khi `submitted`.
- [x] Entity TypeORM, đặt trong các module `users`, `courses`, `lessons`, `words`, `tests`,
      `enrollments`, `progress`.
- [x] Seed (`yarn db:seed`): 1 admin, vài user, 2–3 khoá học, mỗi khoá vài lesson, mỗi lesson
      có từ vựng và 1 bài test trắc nghiệm. (Phase 1 chưa có admin CRUD cho lesson/word/test.)
      ID sinh cố định từ key nên chạy lại chỉ upsert. Cài `argon2` ngay ở bước này để hash mật
      khẩu seed. Tài khoản và dữ liệu seed: xem [database.md](database.md#dữ-liệu-seed-dev).
- [x] Kiểm tra: migrate → revert → migrate lại; seed chạy lại không nhân đôi dữ liệu.

## Bước 2 – Auth

Đã merge vào `main` qua PR #1 (`d1099ad`, commit `a3ea68d`).

- [x] Cài `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/throttler`.
- [x] `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- [x] JWT dạng Bearer; logout đưa token vào blacklist trên Redis tới khi hết hạn.
- [x] Guard JWT toàn cục (bỏ qua route `@Public()`), bật `RolesGuard` toàn cục, decorator `@CurrentUser()`.
      Route mẫu `GET /` được đánh dấu `@Public()`.
- [x] Login giới hạn 5 lần/phút. Biến env `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`.
- [x] Kiểm tra: unit test `AuthService` (8 case) và `JwtStrategy` (3 case, gồm token đã logout
      bị từ chối).

## Bước 3 – Admin quản lý khoá học

Đã merge vào `main` qua PR #2 (`7655041`, commit `c896483`, `9ad1eec`, `194f1bd`).

- [x] `GET /admin/courses`: tìm theo tên khoá, tên học viên, khoảng ngày tạo; sắp xếp; phân trang.
      Ngày giờ phải có múi giờ; `createdTo` chỉ có ngày thì tính hết ngày đó (UTC).
- [x] `POST`, `GET /:id`, `PATCH`, `DELETE` (soft delete) cho `/admin/courses`.
- [x] `PUT /admin/courses/:id/lessons`: gán danh sách lesson theo thứ tự, trong transaction có
      khoá dòng course để hai request gán cùng lúc không xung đột.
- [x] `GET /admin/lessons`: danh sách lesson rút gọn cho màn chọn lesson.
- [x] Query viết bằng QueryBuilder của TypeORM, không dùng SQL thuần.
- [x] Kiểm tra: chạy thật trên local với dữ liệu seed và collection Postman (folder
      `Admin – Courses`); unit test cho helper escape LIKE.

## Bước 4 – Đăng ký khoá học, admin duyệt

Đã merge vào `main` qua PR #3 (`0a1574d`, commit `f962e1f`, `c857931`, `7116e25`).

- [x] User: `GET /courses`, `GET /courses/:id`, `POST /courses/:id/enroll`, `GET /me/courses`.
      Bị `rejected` thì được đăng ký lại (về `pending`).
- [x] Admin: `GET /admin/user-courses`, `PATCH /admin/user-courses/:id/approve` (từ `pending`),
      `PATCH /admin/user-courses/:id/reject` (từ `pending` hoặc `approved`, kèm `reason` tuỳ chọn).
- [x] Không gửi mail ở bước này.
- [x] Course đã soft delete không hiện ở `GET /courses`, `GET /me/courses` và
      `GET /admin/user-courses`; enroll vào course đã xoá trả `404 COURSE_NOT_FOUND`.
- [x] `progress` ở chi tiết course và `/me/courses` tính trực tiếp bằng query
      (`ProgressService.summarize`), không cache.
- [x] Request đồng thời: enroll dùng `INSERT ... ON CONFLICT DO NOTHING` + `UPDATE` có điều kiện;
      approve/reject khoá dòng `user_courses` trong transaction.
- [x] Kiểm tra: chạy thật trên local với dữ liệu seed (gồm enroll/approve gửi đồng thời) và
      collection Postman (folder `Courses`, `Admin – User courses`); unit test hàm tính phần trăm.

## Bước 5 – Lesson và tiến độ

Đã merge vào `main` qua PR #4 (`aed18cc`, commit `fb870e9`, `00218f1`).

- [x] `GET /courses/:id/lessons`: lesson theo `position`, kèm `wordCount`, trạng thái
      `todo/doing/pass/fail` và `bestScore` của user (chưa có `user_lessons` thì `todo`).
- [x] `GET /lessons/:id`: danh sách từ theo `position` và thông tin bài test
      (`questionCount`, `passScore`, `currentAttemptId`); lesson chưa có test thì `test: null`.
- [x] `GET /courses/:id/progress`: tiến độ khoá học kèm số lesson theo trạng thái, tính trực tiếp
      bằng một query (không cache).
- [x] Chỉ user đã được duyệt vào khoá mới truy cập được: course trả `403 COURSE_NOT_APPROVED`,
      lesson trả `403 LESSON_NOT_ACCESSIBLE` (lesson phải thuộc ít nhất một khoá chưa xoá mà user
      đã `approved`). Thứ tự lỗi `400` → `404` → `403`.
- [x] Kiểm tra: chạy thật trên local với dữ liệu seed và `user_lessons` / `test_attempts` chèn tạm
      (đủ trạng thái, lesson thuộc 2 khoá, khoá đã xoá, lesson chưa có test, thu hồi rồi duyệt
      lại) và collection Postman (folder `Lessons & progress`); unit test hàm đếm trạng thái.

## Bước 6 – Làm bài test

Đã merge vào `main` qua PR #5 (`ff3a954`, commit `e1c73e6`, `3843636`).

- [x] `POST /lessons/:id/test/attempts`: bắt đầu làm bài, trả câu hỏi không kèm đáp án
      (thứ tự câu hỏi và đáp án theo `position`, không giới hạn thời gian). Đã có attempt `doing`
      thì trả lại (`200`), tạo mới thì `201`; request đồng thời chỉ tạo 1 attempt
      (`INSERT ... ON CONFLICT DO NOTHING` trên partial unique index).
- [x] `POST /test-attempts/:id/submit`: chấm điểm trong một transaction có khoá dòng attempt,
      cập nhật `user_lessons` (đã `pass` thì giữ `pass`, `best_score` lấy điểm cao nhất).
- [x] `GET /test-attempts/:id`: kết quả kèm đáp án đúng; còn `doing` thì trả câu hỏi như lúc
      bắt đầu.
- [x] Cả 3 API yêu cầu lesson truy cập được (`403 LESSON_NOT_ACCESSIBLE`); attempt của user
      khác trả `404 ATTEMPT_NOT_FOUND`.
- [x] Sửa format lỗi validation lồng nhau: không trả mục cha (`answers`, `answers.0`) có
      `messages` rỗng.
- [x] Unit test phần chấm điểm: pass/fail, bỏ trống câu, nộp hai lần, đáp án không thuộc câu hỏi
      (`gradeAttempt`, `lessonAfterAttempt`, `TestAttemptsService.submit`).
- [x] Kiểm tra: chạy thật trên local với dữ liệu seed (start đồng thời, submit đồng thời, làm lại
      sau pass/fail, bỏ trống hết, lesson chưa có test, thu hồi rồi duyệt lại) và collection
      Postman (folder `Tests`).
- Không làm `GET /lessons/:id/test/attempts` (lịch sử làm bài, tuỳ chọn trong spec).

## Bước 7 – Danh sách từ

Đã merge vào `main` qua PR #6 (`a2c1ebc`, commit `2d54480`, `21e1fee`).

- [x] `GET /words`: lọc `status=learned|not_learned`, `courseId`, `lessonId`, `keyword`;
      sắp xếp (mặc định `content`, không phân biệt hoa thường); phân trang. Mỗi từ kèm `learned`
      và các `lessons` chứa nó.
- [x] Chỉ gồm từ của lesson thuộc khoá chưa xoá mà user đã `approved`. "Đã học" tính trên mọi
      lesson user đã `pass`, không phụ thuộc filter course / lesson.
- [x] Query bằng QueryBuilder với `EXISTS` nên mỗi từ một dòng, `COUNT` và phân trang không bị
      nhân dòng; mỗi request 3 query (đếm, lấy trang, lesson của các từ trong trang).
- [x] Kiểm tra: chạy thật trên local với dữ liệu seed và `user_lessons` / đăng ký chèn tạm
      (lesson thuộc 2 khoá, khoá đã xoá, từ đã học) và collection Postman (folder `Words`).

## Hạ tầng – Đã chốt

| Mục           | Lựa chọn                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server        | VPS 2 CPU / 4 GB RAM / 40 GB SSD, Ubuntu 24.04 LTS x64 (image `linux/amd64`)                                                                           |
| Chạy trên VPS | App, Postgres, Redis, Caddy (HTTPS tự động), monitoring tự host                                                                                        |
| Mail prod     | SMTP của hosting shared (465/587), hosting chỉ dùng cho mail, không chạy app                                                                           |
| Mail dev      | Mailpit (SMTP `1025`, web UI `8025`)                                                                                                                   |
| Nội dung mail | Song ngữ trong một mail: tiếng Việt ở trên, tiếng Anh ở dưới; không cần cột ngôn ngữ cho user                                                          |
| Registry      | GHCR (`ghcr.io/<owner>/elearning-server`), chỉ giữ ~5 image gần nhất                                                                                   |
| Monitoring    | Prometheus + Grafana + Loki tự host; lỗi gửi Sentry (free)                                                                                             |
| Tên miền      | Không ghi domain thật vào repo. Caddy đọc từ biến `API_HOST`, CD lấy từ secret của GitHub Environment `production`; `MAIL_*` cũng chỉ nằm trong secret |
| Cảnh báo      | Discord qua webhook (Alertmanager `discord_configs`); webhook URL là secret `DISCORD_WEBHOOK_URL`, không ghi vào repo                                  |

## Bước 8 – CI

Đã merge vào `main` qua PR #7 (`3ebd0fc`, commit `5b19349`, `9f3d69f`).

- [x] `.github/workflows/ci.yml` chạy khi có PR vào `main` và khi push `main`; push mới huỷ lượt
      chạy cũ. Composite action `.github/actions/setup` dùng chung: Node theo `.nvmrc`, cache
      `node_modules` theo OS + version Node + hash `yarn.lock` (trúng cache thì bỏ `yarn install`).
- [x] Job kiểm tra: `lint:check`, `format:check`, `typecheck`, `test`, `build`.
- [x] Job migration chỉ cần `postgres` (không cần Redis): migrate → revert (không còn bảng) →
      migrate (`pg_dump` schema giống lần đầu, bỏ dòng `\restrict`), seed 2 lần (số dòng không
      đổi). User/password/DB khai báo một lần ở service, dùng lại qua YAML anchor và `PG*`.
- [x] Commitlint cho các commit trong PR (job riêng, không gộp vào job kiểm tra).
- [x] Xoá e2e mẫu (`test/app.e2e-spec.ts`, `test/jest-e2e.json`, script `test:e2e`).
- [ ] Bật branch protection cho `main`, bắt buộc 3 check pass (làm tay trên GitHub).

## Bước 9 – Docker và health check

- [ ] `GET /health/live` (process còn chạy) và `GET /health/ready` (`SELECT 1` + Redis `PING`),
      đều `@Public`.
- [ ] `Dockerfile` multi-stage trên `node:20.19-slim`: build → prod deps
      (`--production --ignore-scripts`, tránh `prepare: husky`) → runner chạy user `node`,
      có `HEALTHCHECK`, `CMD ["node", "dist/main"]`.
- [ ] Script `db:migrate:prod` chạy migration từ `dist/database/typeorm.datasource.js`
      (image prod không có ts-node; seed chỉ dùng ở dev).
- [ ] `.dockerignore`; `docker-compose.yml` cho dev: `postgres`, `redis`, `mailpit` (có healthcheck,
      volume), service `app` đặt sau profile.
- [ ] README: dựng môi trường dev bằng `docker compose up -d`.
- [ ] CI: thêm job build image (chưa push).

## Bước 10 – Gửi mail

- [ ] `@nestjs/bullmq`, `bullmq`, `nodemailer`, `handlebars`. Queue `mail` dùng `REDIS_URL`,
      prefix `${REDIS_KEY_PREFIX}bull`.
- [ ] Env (validate + `.env.example`): `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`,
      `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_RATE_PER_HOUR`.
- [ ] `MailModule`: `MailService` đưa job vào queue; `MailProcessor` render template và gửi bằng
      nodemailer; retry 3 lần backoff tăng dần; rate limiter theo `MAIL_RATE_PER_HOUR` (hosting
      shared giới hạn mail/giờ).
- [ ] Template song ngữ (vi trên, en dưới, HTML + text): `course-approved`, `course-rejected`,
      `course-revoked` (từ chối / thu hồi kèm `reason` nếu có). Tiêu đề dạng
      `Đăng ký khoá học đã được duyệt / Course enrollment approved`. Thêm template vào `assets`
      của `nest-cli.json`.
- [ ] Gọi từ `AdminUserCoursesService.approve/reject` **sau khi transaction commit**; enqueue lỗi
      thì chỉ log, API vẫn thành công.
- [ ] Unit test processor (mock transporter) và việc enqueue đúng template ở 3 trường hợp; chạy thật
      với Mailpit.
- [ ] Cập nhật `api-spec.md`, bỏ mail khỏi phần tạm hoãn.
- Việc làm tay trước khi chạy prod: tạo hộp mail `no-reply@<domain>` trên hosting; bật SPF, DKIM,
  DMARC; từ VPS kiểm tra `nc -vz mail.<domain> 465` và hosting cho đăng nhập SMTP từ IP VPS.

## Bước 11 – Monitoring

- [ ] Log: `nestjs-pino`, JSON ở prod / `pino-pretty` ở dev, `requestId` (nhận `x-request-id` hoặc
      tự sinh, trả lại trong response), redact `authorization`, `password`, `token`; bỏ log
      `/health`, `/metrics`. `AllExceptionsFilter`: 5xx log `error` kèm stack.
- [ ] Metrics: `prom-client`, `/metrics` trên cổng riêng `METRICS_PORT` chỉ mở nội bộ. Gồm metric
      mặc định của Node, HTTP duration theo `method` / `route` (template) / `status`, pool DB, queue
      `mail`, chỉ số nghiệp vụ (đăng ký, duyệt/từ chối, nộp bài).
- [ ] Sentry (`@sentry/nestjs`) cho lỗi 5xx kèm `requestId`, `userId`, release (git sha); tắt khi
      `SENTRY_DSN` trống.
- [ ] Compose profile `monitoring`: Prometheus, Grafana (datasource + dashboard provision sẵn trong
      `monitoring/grafana/`), Loki + Promtail, postgres-exporter, redis-exporter, node-exporter.
- [ ] Alert rule (`monitoring/prometheus/alerts.yml`): app down > 1 phút, 5xx > 5% trong 5 phút,
      p95 > 1s, có job mail lỗi, pool DB cạn. Alertmanager gửi cảnh báo (và báo hết lỗi) vào
      channel Discord qua `DISCORD_WEBHOOK_URL`.
- [ ] Unit test redact log và label `route`; chạy thật: xem dashboard/log, tạo lỗi 500 xem Sentry,
      tắt Redis xem `/health/ready` và alert.
- Việc làm tay: tạo project Sentry, lấy `SENTRY_DSN`; tạo server Discord riêng, channel `#alerts`,
  tạo webhook (Server Settings → Integrations → Webhooks), lấy `DISCORD_WEBHOOK_URL`.

## Bước 12 – CD và production

- [ ] `release.yml`: merge vào `main` → build image `linux/amd64`, push GHCR tag `sha-<short>` +
      `latest`, dọn image cũ.
- [ ] `docker-compose.prod.yml`: app, Postgres, Redis, Caddy, monitoring; `mem_limit` từng
      container, rotate log Docker (`max-size: 10m`, `max-file: 3`), Prometheus giữ 15 ngày, Loki
      giữ 7 ngày. Grafana không public (SSH tunnel hoặc subdomain có basic auth sau Caddy).
- [ ] Deploy qua SSH: `pull` → chạy `db:migrate:prod` → `up -d` → chờ `/health/ready`, lỗi thì
      job fail. Gắn git sha vào image và Sentry release.
- [ ] Backup `pg_dump` bằng cron, giữ vài bản trên VPS, đẩy một bản ra ngoài.
- [ ] Script chuẩn bị VPS Ubuntu 24.04: Docker Engine + Compose plugin (repo apt của Docker), user
      `deploy` (group `docker`, SSH key), `ufw` chỉ mở 22/80/443, swap 2 GB, `fail2ban`,
      `unattended-upgrades`.
- [ ] README: phần deploy.
- Việc làm tay: chạy script chuẩn bị VPS; trỏ DNS domain về IP VPS; tạo GitHub Environment
  `production` với secrets (SSH key, `DATABASE_URL`, `JWT_SECRET`, `MAIL_*`, `SENTRY_DSN`, `API_HOST`…);
  sau deploy tạo uptime check (UptimeRobot / Better Stack) vào `/health/ready`.

## Để sau (ngoài Phase 1)

Profile, lọc từ nâng cao, đăng nhập Facebook/Twitter/Google, admin CRUD lesson/word/test,
thêm admin quản lý course, refresh token.

Tạm hoãn trong Phase 1:

- Giới hạn thời gian làm bài test, xáo trộn thứ tự đáp án.
- Cache tiến độ trên Redis (`progress:{userId}:{courseId}`). Khi làm phải xoá cache khi user nộp
  bài (mọi course chứa lesson đó), khi admin đổi danh sách lesson của course (mọi user của course)
  hoặc đặt TTL ngắn.
