import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsModule } from '../lessons/lessons.module';
import { AdminCoursesController } from './admin-courses.controller';
import { AdminCoursesService } from './admin-courses.service';
import { CourseLesson } from './entities/course-lesson.entity';
import { Course } from './entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseLesson]), LessonsModule],
  controllers: [AdminCoursesController],
  providers: [AdminCoursesService],
  exports: [TypeOrmModule],
})
export class CoursesModule {}
