# e-Learning API – Phase 1

Tài liệu các API cần làm trước. Thiết kế DB xem [database.md](database.md).
Swagger (sinh từ code) có ở `GET /docs` khi chạy local.

## Phạm vi Phase 1

| #   | Chức năng (spec)                        | Role  | API                                                                  |
| --- | --------------------------------------- | ----- | -------------------------------------------------------------------- |
| 1   | Đăng ký / đăng nhập / đăng xuất         | User  | `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me` |
| 2   | Xem các từ đã học                       | User  | `GET /words?status=learned`                                          |
| 3   | Xem danh sách các từ                    | User  | `GET /words`                                                         |
| 4   | Chọn khoá học                           | User  | `GET /courses`, `GET /courses/:id`, `POST /courses/:id/enroll`       |
| 5   | Xem các lesson trong khoá học           | User  | `GET /courses/:id/lessons`, `GET /lessons/:id`                       |
| 6   | Xem tiến độ trong khoá học              | User  | `GET /me/courses`, `GET /courses/:id/progress`                       |
| 7   | Làm bài test bằng cách chọn đáp án      | User  | `POST /lessons/:id/test/attempts`, `POST /test-attempts/:id/submit`  |
| 8   | Xem đáp án đúng sau khi nộp bài         | User  | `GET /test-attempts/:id`                                             |
| 9   | Thêm/sửa/xoá/hiển thị course            | Admin | `/admin/courses` (CRUD + search) , `PUT /admin/courses/:id/lessons`  |
| 10  | Quản lý user courses (approve / reject) | Admin | `GET /admin/user-courses`, `PATCH .../approve`, `PATCH .../reject`   |

**Ngoài phạm vi Phase 1** (làm sau): profile, lọc từ nâng cao, login Facebook/Twitter/Google,
CRUD lesson/word/test cho admin, thêm admin quản lý course, refresh token.

**Tạm hoãn** (có trong spec gốc nhưng chưa làm ở Phase 1): gửi mail cho user khi approve /
reject course; giới hạn thời gian làm bài test; xáo trộn thứ tự đáp án.
Dữ liệu lesson / word / test trong Phase 1 được tạo bằng **seed**.

---

## Quy ước chung

- **Base URL:** `/api/v1` (cấu hình bởi env `API_PREFIX`).
- **Auth:** `Authorization: Bearer <accessToken>` (JWT). Đăng xuất = đưa token vào blacklist
  trên Redis tới khi hết hạn.
- **Ngôn ngữ:** header `x-lang: vi|en`, query `?lang=`, hoặc `Accept-Language`. Mặc định `vi`.
- **Thời gian:** ISO 8601 UTC. **ID:** UUID.
- **Phân trang:** `?page=1&limit=20` (limit tối đa 100). Response dạng:

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
}
```

- **Lỗi:** mọi lỗi có cùng format; client dựa vào `code`, `message` đã được dịch.

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "field": "email", "messages": ["email không đúng định dạng email"] }
  ],
  "path": "/api/v1/auth/register",
  "timestamp": "2026-10-21T03:16:29.399Z"
}
```

| HTTP | code chung                   | Khi nào                                                       |
| ---- | ---------------------------- | ------------------------------------------------------------- |
| 400  | `BAD_REQUEST` / mã nghiệp vụ | Vi phạm rule nghiệp vụ                                        |
| 401  | `UNAUTHORIZED`               | Thiếu/sai/hết hạn/đã logout token                             |
| 403  | `FORBIDDEN`                  | Không đủ quyền (không phải admin, chưa được duyệt vào course) |
| 404  | `NOT_FOUND` / `*_NOT_FOUND`  | Không tìm thấy                                                |
| 409  | `CONFLICT` / mã nghiệp vụ    | Trùng dữ liệu                                                 |
| 422  | `VALIDATION_FAILED`          | Body/query không hợp lệ                                       |
| 429  | `TOO_MANY_REQUESTS`          | Vượt rate limit                                               |

---

## 1. Auth

### POST /auth/register — Đăng ký

Public. Tạo tài khoản role `user` và trả token luôn.

```json
// Request
{
  "email": "nam@example.com",
  "password": "Secret123",
  "fullName": "Phạm Giang Nam"
}
```

Validate: `email` đúng định dạng, ≤ 320; `password` 8–72 ký tự, có chữ và số; `fullName` 1–100.

```json
// 201
{
  "accessToken": "eyJhbGciOi...",
  "expiresIn": 86400,
  "user": {
    "id": "6f0c...",
    "email": "nam@example.com",
    "fullName": "Phạm Giang Nam",
    "avatarUrl": null,
    "role": "user",
    "createdAt": "2026-10-21T03:00:00.000Z"
  }
}
```

Lỗi: `409 EMAIL_ALREADY_EXISTS`, `422`.

### POST /auth/login — Đăng nhập

Public, rate limit 5 lần/phút/IP.

```json
{ "email": "nam@example.com", "password": "Secret123" }
```

`200` – body giống register. Lỗi: `401 INVALID_CREDENTIALS` (không phân biệt sai email hay sai
mật khẩu), `429`.

### POST /auth/logout — Đăng xuất

Auth. Thu hồi token hiện tại (Redis key `auth:blacklist:{sha256(token)}`, TTL = thời gian còn lại).
`204 No Content`.

### GET /auth/me — Thông tin user hiện tại

Auth. `200` → object `user` như trên.

---

## 2. Courses (User)

### GET /courses — Danh sách khoá học để chọn

Auth. Query: `page`, `limit`, `keyword` (tìm theo tên).

```json
// 200
{
  "items": [
    {
      "id": "c1...",
      "name": "TOEIC 600 Vocabulary",
      "description": "…",
      "thumbnailUrl": null,
      "lessonCount": 12,
      "enrollment": { "id": "uc1...", "status": "approved" },
      "createdAt": "2026-10-01T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

`enrollment` = `null` nếu user chưa đăng ký; `status`: `pending | approved | rejected`.

### GET /courses/:courseId — Chi tiết khoá học

Auth. Như item ở trên + `progress` (chỉ khi `approved`, còn lại `null`).
Lỗi: `404 COURSE_NOT_FOUND`.

### POST /courses/:courseId/enroll — Chọn (đăng ký) khoá học

Auth. Tạo `user_courses` với `status = pending`, chờ admin duyệt.
Nếu trước đó bị `rejected` → chuyển lại về `pending`.

```json
// 201
{ "id": "uc1...", "courseId": "c1...", "status": "pending", "createdAt": "…" }
```

Lỗi: `404 COURSE_NOT_FOUND`, `409 ALREADY_ENROLLED` (đang `pending`/`approved`).

### GET /courses/:courseId/lessons — Lesson trong khoá học

Auth, **user phải được `approved`** vào course (nếu không: `403 COURSE_NOT_APPROVED`).

```json
// 200
{
  "items": [
    {
      "id": "l1...",
      "title": "Lesson 1 – Office",
      "position": 1,
      "wordCount": 20,
      "status": "pass",
      "bestScore": 90
    }
  ]
}
```

`status`: `todo | doing | pass | fail` của user hiện tại. Không phân trang (sắp theo `position`).

### GET /courses/:courseId/progress — Tiến độ trong khoá học

Auth, approved.

```json
// 200
{
  "courseId": "c1...",
  "totalLessons": 12,
  "passedLessons": 5,
  "percent": 41.67,
  "lessons": { "todo": 5, "doing": 1, "pass": 5, "fail": 1 }
}
```

### GET /me/courses — Khoá học của tôi

Auth. Query: `page`, `limit`, `status` (`pending|approved|rejected`).
Item: thông tin course + `enrollment` + `progress` (`{ totalLessons, passedLessons, percent }`
khi approved).

---

## 3. Lesson & Test (User)

> Điều kiện chung: lesson phải thuộc ít nhất một course mà user đã `approved`,
> nếu không → `403 LESSON_NOT_ACCESSIBLE`.

### GET /lessons/:lessonId — Chi tiết lesson

```json
// 200
{
  "id": "l1...",
  "title": "Lesson 1 – Office",
  "description": "…",
  "status": "doing",
  "bestScore": null,
  "words": [{ "id": "w1...", "content": "deadline", "meaning": "hạn chót" }],
  "test": {
    "id": "t1...",
    "questionCount": 10,
    "passScore": 80,
    "currentAttemptId": "a1..."
  }
}
```

`currentAttemptId`: attempt đang `doing` (nếu có) để làm tiếp.

### POST /lessons/:lessonId/test/attempts — Bắt đầu làm bài

Tạo attempt `doing`; `user_lessons.status` → `doing`. Nếu đã có attempt `doing` thì trả lại
attempt đó (idempotent, `200`), còn tạo mới thì `201`.
Câu hỏi và đáp án **không kèm** `isCorrect`. Câu hỏi và đáp án sắp theo `position` (không xáo
trộn). Không giới hạn thời gian làm bài.

```json
// 201
{
  "id": "a1...",
  "testId": "t1...",
  "status": "doing",
  "startedAt": "2026-10-21T03:10:00.000Z",
  "questions": [
    {
      "id": "q1...",
      "content": "\"deadline\" nghĩa là gì?",
      "options": [
        { "id": "o1...", "content": "hạn chót" },
        { "id": "o2...", "content": "cuộc họp" },
        { "id": "o3...", "content": "nghỉ phép" },
        { "id": "o4...", "content": "tiền lương" }
      ]
    }
  ]
}
```

Lỗi: `404 TEST_NOT_FOUND` (lesson chưa có test).

### POST /test-attempts/:attemptId/submit — Nộp bài

Chỉ chủ attempt, attempt phải `doing`. Câu không gửi = bỏ trống (tính sai).

```json
// Request
{
  "answers": [
    { "questionId": "q1...", "optionId": "o1..." },
    { "questionId": "q2...", "optionId": "o7..." }
  ]
}
```

Xử lý (trong 1 transaction):

1. Kiểm tra `questionId` thuộc test, `optionId` thuộc câu hỏi (`422 INVALID_ANSWER`).
2. Chấm điểm `score = round(correct / total * 100)`; `passed = score >= passScore`.
3. Lưu `attempt_answers`, attempt → `submitted`.
4. Cập nhật `user_lessons`: `pass` nếu passed (đã pass thì giữ `pass`), ngược lại `fail`;
   cập nhật `best_score`.
5. Xoá cache progress của user.

`200` → kết quả giống `GET /test-attempts/:id`.
Lỗi: `404 ATTEMPT_NOT_FOUND`, `409 ATTEMPT_ALREADY_SUBMITTED`, `422 INVALID_ANSWER`.

### GET /test-attempts/:attemptId — Xem kết quả & đáp án đúng

Chỉ chủ attempt. Nếu attempt còn `doing` → trả câu hỏi như lúc bắt đầu (không có đáp án đúng).
Khi `submitted`:

```json
// 200
{
  "id": "a1...",
  "lessonId": "l1...",
  "status": "submitted",
  "score": 90,
  "passScore": 80,
  "passed": true,
  "correctCount": 9,
  "totalQuestions": 10,
  "startedAt": "…",
  "submittedAt": "…",
  "questions": [
    {
      "id": "q1...",
      "content": "\"deadline\" nghĩa là gì?",
      "selectedOptionId": "o1...",
      "correctOptionId": "o1...",
      "isCorrect": true,
      "options": [
        { "id": "o1...", "content": "hạn chót" },
        { "id": "o2...", "content": "cuộc họp" }
      ]
    }
  ]
}
```

### GET /lessons/:lessonId/test/attempts — Lịch sử làm bài (tuỳ chọn)

Danh sách attempt của user cho lesson: `id, status, score, passed, submittedAt`.

---

## 4. Words (User)

### GET /words — Danh sách từ / từ đã học

Auth. Chỉ gồm từ thuộc lesson của các course mà user đã `approved`.

| Query           | Mô tả                                                  |
| --------------- | ------------------------------------------------------ |
| `status`        | `all` (mặc định) \| `learned` \| `not_learned`         |
| `courseId`      | lọc theo khoá học                                      |
| `lessonId`      | lọc theo lesson                                        |
| `keyword`       | tìm trong `content` hoặc `meaning` (ILIKE)             |
| `sort`          | `content` \| `-content` \| `createdAt` \| `-createdAt` |
| `page`, `limit` |                                                        |

"Đã học" = từ thuộc lesson mà user có status `pass` (xem lưu ý trong database.md).

```json
// 200
{
  "items": [
    {
      "id": "w1...",
      "content": "deadline",
      "meaning": "hạn chót",
      "learned": true,
      "lessons": [{ "id": "l1...", "title": "Lesson 1 – Office" }]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
}
```

---

## 5. Admin – Courses

> Tất cả API `/admin/*` yêu cầu role `admin` (nếu không: `403 FORBIDDEN`).

### GET /admin/courses — Danh sách + search

| Query                      | Mô tả                                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| `keyword`                  | tên khoá học chứa chuỗi này (ILIKE, tối đa 255)                         |
| `studentName`              | khoá học có học viên (approved/pending) tên chứa chuỗi này (tối đa 100) |
| `createdFrom`, `createdTo` | khoảng ngày tạo, gồm cả hai đầu (xem bên dưới)                          |
| `sort`                     | `-createdAt` (mặc định) \| `createdAt` \| `name` \| `-name`             |
| `page`, `limit`            |                                                                         |

- `createdFrom` / `createdTo` nhận ngày `2026-10-01` hoặc ngày giờ có múi giờ
  (`2026-10-01T10:00:00Z`, `2026-10-01T17:00:00+07:00`). Ngày giờ không có múi giờ trả `422`.
  `createdTo` chỉ có ngày thì tính hết ngày đó theo UTC.
- `%` và `_` trong `keyword` / `studentName` được tìm đúng như ký tự thường.
- `studentCount` là số học viên `approved`, `pendingCount` là số đăng ký `pending`.
- Kết quả cùng giá trị sắp xếp thì xếp tiếp theo `id`, nên phân trang không trùng hay sót.

```json
// 200
{
  "items": [
    {
      "id": "c1...",
      "name": "TOEIC 600 Vocabulary",
      "description": "…",
      "thumbnailUrl": null,
      "lessonCount": 12,
      "studentCount": 35,
      "pendingCount": 3,
      "createdBy": { "id": "u0...", "fullName": "Admin" },
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### POST /admin/courses — Tạo course

```json
{
  "name": "TOEIC 600 Vocabulary",
  "description": "…",
  "thumbnailUrl": null,
  "lessonIds": ["l1...", "l2..."]
}
```

`name` bắt buộc, 1–255 (đã trim); `thumbnailUrl` là URL (tối đa 2048) hoặc `null`;
`lessonIds` tuỳ chọn, là UUID không trùng nhau, thứ tự trong mảng = `position` (bắt đầu từ 1).
`201` → chi tiết course. Lỗi: `422`, `404 LESSON_NOT_FOUND` (có id không tồn tại).

> Với mọi API có `:courseId`: id không phải UUID trả `400 BAD_REQUEST`; course không tồn tại
> hoặc đã xoá trả `404 COURSE_NOT_FOUND`.

### GET /admin/courses/:courseId — Chi tiết

Các field như một item của danh sách, thêm `lessons` theo thứ tự `position`:

```json
{
  "id": "c1...",
  "name": "TOEIC 600 Vocabulary",
  "lessonCount": 2,
  "studentCount": 35,
  "pendingCount": 3,
  "…": "…",
  "lessons": [
    {
      "id": "l2...",
      "title": "Office",
      "position": 1,
      "wordCount": 6,
      "hasTest": true
    },
    {
      "id": "l1...",
      "title": "Meetings",
      "position": 2,
      "wordCount": 6,
      "hasTest": true
    }
  ]
}
```

### PATCH /admin/courses/:courseId — Cập nhật

Partial update: `name`, `description`, `thumbnailUrl`. `200` → chi tiết.
Field không gửi thì giữ nguyên; gửi `null` cho `description` / `thumbnailUrl` để xoá giá trị;
`name` không được `null`. Lesson đổi qua `PUT .../lessons`.

### PUT /admin/courses/:courseId/lessons — Gán danh sách lesson

Thay toàn bộ danh sách lesson của course (n-n; một lesson có thể thuộc nhiều course).

```json
{ "lessonIds": ["l2...", "l1...", "l5..."] }
```

Mảng rỗng = bỏ hết lesson. `200` → mảng lesson mới, cùng dạng `lessons` của API chi tiết.
Lỗi: `404 COURSE_NOT_FOUND`, `404 LESSON_NOT_FOUND`, `422`.
Không ảnh hưởng `user_lessons` (tiến độ được tính lại theo danh sách mới).

### DELETE /admin/courses/:courseId — Xoá

Soft delete (`deleted_at`), course không còn hiện cho user. `204`. Xoá lần nữa trả
`404 COURSE_NOT_FOUND`.

### GET /admin/lessons — (hỗ trợ màn chọn lesson)

Danh sách lesson rút gọn để chọn khi tạo/sửa course: `?keyword=&page=&limit=` →
`{ id, title, wordCount, hasTest }`, sắp xếp theo `title`. `keyword` tìm theo tên lesson (ILIKE).

---

## 6. Admin – User courses

### GET /admin/user-courses — Danh sách đăng ký

| Query           | Mô tả                                  |
| --------------- | -------------------------------------- |
| `status`        | `pending` \| `approved` \| `rejected`  |
| `courseId`      |                                        |
| `keyword`       | tên hoặc email học viên                |
| `sort`          | `-createdAt` (mặc định) \| `createdAt` |
| `page`, `limit` |                                        |

```json
// 200
{
  "items": [
    {
      "id": "uc1...",
      "status": "pending",
      "user": {
        "id": "u1...",
        "fullName": "Phạm Giang Nam",
        "email": "nam@example.com"
      },
      "course": { "id": "c1...", "name": "TOEIC 600 Vocabulary" },
      "reviewedBy": null,
      "reviewedAt": null,
      "rejectReason": null,
      "createdAt": "…"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### PATCH /admin/user-courses/:id/approve — Duyệt

Chỉ từ `pending`. Set `status = approved`, `reviewed_by`, `reviewed_at`, xoá `reject_reason`.
`200` → item. Lỗi: `404 USER_COURSE_NOT_FOUND`, `409 INVALID_ENROLLMENT_STATUS`.

### PATCH /admin/user-courses/:id/reject — Từ chối / thu hồi

```json
{ "reason": "Khoá học đã đủ học viên" }
```

`reason` tuỳ chọn, ≤ 500. Áp dụng cho:

- `pending` → `rejected`: từ chối đăng ký.
- `approved` → `rejected`: **thu hồi** quyền học. User không còn truy cập được course
  (`403 COURSE_NOT_APPROVED`), nhưng tiến độ (`user_lessons`, `test_attempts`) được giữ nguyên;
  nếu đăng ký lại và được duyệt thì học tiếp từ chỗ cũ.

Set `status = rejected`, `reviewed_by`, `reviewed_at`, `reject_reason`.
`200` → item. Lỗi: `404 USER_COURSE_NOT_FOUND`, `409 INVALID_ENROLLMENT_STATUS` (đã `rejected`).

---

## Thứ tự triển khai đề xuất

1. Migration toàn bộ schema Phase 1 + seed (admin, course, lesson, word, test).
2. Auth (register/login/logout/me, JWT guard global + `@Public()`, `RolesGuard`).
3. Admin courses + lessons picker.
4. Enroll + Admin user-courses (approve / reject / thu hồi).
5. Course lessons, lesson detail, progress.
6. Test attempts (start/submit/result).
7. Words list.

Chi tiết từng bước và trạng thái: xem [plan.md](plan.md).
