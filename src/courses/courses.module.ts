import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseLesson } from './entities/course-lesson.entity';
import { Course } from './entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseLesson])],
  exports: [TypeOrmModule],
})
export class CoursesModule {}
