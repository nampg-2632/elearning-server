import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { LessonsModule } from '../lessons/lessons.module';
import { ProgressModule } from '../progress/progress.module';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseLesson } from './entities/course-lesson.entity';
import { Course } from './entities/course.entity';
import { MyCoursesController } from './my-courses.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseLesson]),
    LessonsModule,
    EnrollmentsModule,
    ProgressModule,
  ],
  controllers: [AdminCoursesController, CoursesController, MyCoursesController],
  providers: [AdminCoursesService, CoursesService],
  exports: [TypeOrmModule],
})
export class CoursesModule {}
