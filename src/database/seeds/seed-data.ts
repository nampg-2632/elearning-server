import { EnrollmentStatus } from '../../enrollments/enums/enrollment-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';

// Dev/demo data for Phase 1 (no admin CRUD for lessons/words/tests yet).
// Every record has a stable `key`; ids are derived from it so the seed can
// be re-run without creating duplicates.

export type SeedUser = {
  key: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export type SeedWord = { content: string; meaning: string };

export type SeedLesson = {
  key: string;
  title: string;
  description: string;
  passScore: number;
  words: SeedWord[];
};

export type SeedCourse = {
  key: string;
  name: string;
  description: string;
  lessonKeys: string[];
};

export type SeedEnrollment = {
  userKey: string;
  courseKey: string;
  status: EnrollmentStatus;
};

export const SEED_ADMIN_PASSWORD = 'Admin12345';
export const SEED_USER_PASSWORD = 'User12345';

export const seedUsers: SeedUser[] = [
  {
    key: 'admin',
    email: 'admin@elearning.local',
    password: SEED_ADMIN_PASSWORD,
    fullName: 'Admin',
    role: UserRole.Admin,
  },
  {
    key: 'user1',
    email: 'user1@elearning.local',
    password: SEED_USER_PASSWORD,
    fullName: 'Nguyễn Văn An',
    role: UserRole.User,
  },
  {
    key: 'user2',
    email: 'user2@elearning.local',
    password: SEED_USER_PASSWORD,
    fullName: 'Trần Thị Bình',
    role: UserRole.User,
  },
  {
    key: 'user3',
    email: 'user3@elearning.local',
    password: SEED_USER_PASSWORD,
    fullName: 'Lê Minh Châu',
    role: UserRole.User,
  },
];

export const seedLessons: SeedLesson[] = [
  {
    key: 'office',
    title: 'Office',
    description: 'Từ vựng về văn phòng và công việc hằng ngày.',
    passScore: 80,
    words: [
      { content: 'deadline', meaning: 'hạn chót' },
      { content: 'colleague', meaning: 'đồng nghiệp' },
      { content: 'salary', meaning: 'tiền lương' },
      { content: 'promotion', meaning: 'sự thăng chức' },
      { content: 'schedule', meaning: 'lịch trình' },
      { content: 'department', meaning: 'phòng ban' },
    ],
  },
  {
    key: 'meetings',
    title: 'Meetings',
    description: 'Từ vựng dùng trong các cuộc họp.',
    passScore: 80,
    words: [
      { content: 'agenda', meaning: 'chương trình nghị sự' },
      { content: 'minutes', meaning: 'biên bản cuộc họp' },
      { content: 'attendee', meaning: 'người tham dự' },
      { content: 'postpone', meaning: 'hoãn lại' },
      { content: 'proposal', meaning: 'đề xuất' },
      { content: 'consensus', meaning: 'sự đồng thuận' },
    ],
  },
  {
    key: 'travel',
    title: 'Business Travel',
    description: 'Từ vựng khi đi công tác.',
    passScore: 80,
    words: [
      { content: 'itinerary', meaning: 'lịch trình chuyến đi' },
      { content: 'boarding pass', meaning: 'thẻ lên máy bay' },
      { content: 'reservation', meaning: 'sự đặt chỗ' },
      { content: 'luggage', meaning: 'hành lý' },
      { content: 'departure', meaning: 'sự khởi hành' },
      { content: 'reimbursement', meaning: 'sự hoàn tiền' },
    ],
  },
  {
    key: 'email',
    title: 'Writing Emails',
    description: 'Từ vựng khi viết email công việc.',
    passScore: 70,
    words: [
      { content: 'attachment', meaning: 'tệp đính kèm' },
      { content: 'recipient', meaning: 'người nhận' },
      { content: 'regarding', meaning: 'liên quan đến' },
      { content: 'follow up', meaning: 'theo dõi tiếp' },
      { content: 'acknowledge', meaning: 'xác nhận đã nhận' },
      { content: 'urgent', meaning: 'khẩn cấp' },
    ],
  },
  {
    key: 'negotiation',
    title: 'Negotiation',
    description: 'Từ vựng khi đàm phán.',
    passScore: 80,
    words: [
      { content: 'compromise', meaning: 'sự thoả hiệp' },
      { content: 'offer', meaning: 'lời đề nghị' },
      { content: 'terms', meaning: 'điều khoản' },
      { content: 'discount', meaning: 'giảm giá' },
      { content: 'contract', meaning: 'hợp đồng' },
      { content: 'deal', meaning: 'thoả thuận' },
    ],
  },
  {
    key: 'environment',
    title: 'Environment',
    description: 'Từ vựng học thuật chủ đề môi trường.',
    passScore: 80,
    words: [
      { content: 'pollution', meaning: 'sự ô nhiễm' },
      { content: 'emission', meaning: 'khí thải' },
      { content: 'sustainable', meaning: 'bền vững' },
      { content: 'deforestation', meaning: 'nạn phá rừng' },
      { content: 'renewable', meaning: 'có thể tái tạo' },
      { content: 'habitat', meaning: 'môi trường sống' },
    ],
  },
  {
    key: 'education',
    title: 'Education',
    description: 'Từ vựng học thuật chủ đề giáo dục.',
    passScore: 80,
    words: [
      { content: 'curriculum', meaning: 'chương trình giảng dạy' },
      { content: 'tuition', meaning: 'học phí' },
      { content: 'assessment', meaning: 'sự đánh giá' },
      { content: 'literacy', meaning: 'khả năng đọc viết' },
      { content: 'scholarship', meaning: 'học bổng' },
      { content: 'graduate', meaning: 'tốt nghiệp' },
    ],
  },
];

// "meetings" belongs to two courses to exercise the n-n relation.
export const seedCourses: SeedCourse[] = [
  {
    key: 'toeic',
    name: 'TOEIC 600 Vocabulary',
    description: 'Từ vựng TOEIC thường gặp trong môi trường công sở.',
    lessonKeys: ['office', 'meetings', 'travel'],
  },
  {
    key: 'business',
    name: 'Business English Essentials',
    description: 'Tiếng Anh giao tiếp cơ bản cho công việc.',
    lessonKeys: ['meetings', 'email', 'negotiation'],
  },
  {
    key: 'ielts',
    name: 'IELTS Academic Words',
    description: 'Từ vựng học thuật cho bài thi IELTS.',
    lessonKeys: ['environment', 'education'],
  },
];

export const seedEnrollments: SeedEnrollment[] = [
  { userKey: 'user1', courseKey: 'toeic', status: EnrollmentStatus.Approved },
  {
    userKey: 'user1',
    courseKey: 'business',
    status: EnrollmentStatus.Pending,
  },
  { userKey: 'user2', courseKey: 'toeic', status: EnrollmentStatus.Pending },
  { userKey: 'user2', courseKey: 'ielts', status: EnrollmentStatus.Approved },
  { userKey: 'user3', courseKey: 'toeic', status: EnrollmentStatus.Rejected },
];
