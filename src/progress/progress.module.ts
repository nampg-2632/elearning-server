import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLesson } from './entities/user-lesson.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserLesson])],
  exports: [TypeOrmModule],
})
export class ProgressModule {}
