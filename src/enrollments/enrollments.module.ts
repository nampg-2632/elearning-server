import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCourse } from './entities/user-course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse])],
  exports: [TypeOrmModule],
})
export class EnrollmentsModule {}
