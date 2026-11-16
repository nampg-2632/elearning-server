import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { AdminUserCoursesController } from './admin-user-courses.controller';
import { AdminUserCoursesService } from './admin-user-courses.service';
import { EnrollmentsService } from './enrollments.service';
import { UserCourse } from './entities/user-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse]), MailModule],
  controllers: [AdminUserCoursesController],
  providers: [EnrollmentsService, AdminUserCoursesService],
  exports: [TypeOrmModule, EnrollmentsService],
})
export class EnrollmentsModule {}
