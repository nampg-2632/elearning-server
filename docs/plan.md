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

Đang review ở PR #3 (branch `feat/enrollments`, commit `f962e1f`, `c857931`, `7116e25`).

- [x] User: `GET /courses`, `GET /courses/:id`, `POST /courses/:id/enroll`, `GET /me/courses`.
      Bị `rejected` thì được đăng ký lại (về `pending`).
- [x] Admin: `GET /admin/user-courses`, `PATCH /admin/user-courses/:id/approve` (từ `pending`),
      `PATCH /admin/user-courses/:id/reject` (từ `pending` hoặc `approved`, kèm `reason` tuỳ chọn).
- [x] Không gửi mail ở bước này.
- [x] Course đã soft delete không hiện ở `GET /courses`, `GET /me/courses` và
      `GET /admin/user-courses`; enroll vào course đã xoá trả `404 COURSE_NOT_FOUND`.
- [x] `progress` ở chi tiết course và `/me/courses` tính trực tiếp bằng query
      (`ProgressService.summarize`), chưa cache; cache Redis làm ở bước 5.
- [x] Request đồng thời: enroll dùng `INSERT ... ON CONFLICT DO NOTHING` + `UPDATE` có điều kiện;
      approve/reject khoá dòng `user_courses` trong transaction.
- [x] Kiểm tra: chạy thật trên local với dữ liệu seed (gồm enroll/approve gửi đồng thời) và
      collection Postman (folder `Courses`, `Admin – User courses`); unit test hàm tính phần trăm.

## Bước 5 – Lesson và tiến độ

- [ ] `GET /courses/:id/lessons`: kèm trạng thái `todo/doing/pass/fail` của user.
- [ ] `GET /lessons/:id`: danh sách từ và thông tin bài test.
- [ ] `GET /courses/:id/progress`: tiến độ khoá học, cache trên Redis.
- [ ] Chỉ user đã được duyệt vào khoá mới truy cập được, ngược lại trả 403.

## Bước 6 – Làm bài test

- [ ] `POST /lessons/:id/test/attempts`: bắt đầu làm bài, trả câu hỏi không kèm đáp án
      (thứ tự câu hỏi và đáp án theo `position`, không giới hạn thời gian).
- [ ] `POST /test-attempts/:id/submit`: chấm điểm trong một transaction, cập nhật `user_lessons`,
      xoá cache tiến độ.
- [ ] `GET /test-attempts/:id`: kết quả kèm đáp án đúng.
- [ ] Unit test phần chấm điểm: pass/fail, bỏ trống câu, nộp hai lần, đáp án không thuộc câu hỏi.

## Bước 7 – Danh sách từ

- [ ] `GET /words`: lọc `status=learned|not_learned`, `courseId`, `lessonId`, `keyword`;
      sắp xếp; phân trang.

## Để sau (ngoài Phase 1)

Profile, lọc từ nâng cao, đăng nhập Facebook/Twitter/Google, admin CRUD lesson/word/test,
thêm admin quản lý course, refresh token.

Tạm hoãn trong Phase 1:

- Gửi mail khi approve/reject (mail module BullMQ + nodemailer, mẫu mail vi/en, chọn SMTP cho dev).
- Giới hạn thời gian làm bài test, xáo trộn thứ tự đáp án.
