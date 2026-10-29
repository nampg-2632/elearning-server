import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserCoursesController } from './admin-user-courses.controller';
import { AdminUserCoursesService } from './admin-user-courses.service';
import { EnrollmentsService } from './enrollments.service';
import { UserCourse } from './entities/user-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse])],
  controllers: [AdminUserCoursesController],
  providers: [EnrollmentsService, AdminUserCoursesService],
  exports: [TypeOrmModule, EnrollmentsService],
})
export class EnrollmentsModule {}
