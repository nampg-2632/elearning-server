import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLesson } from './entities/user-lesson.entity';
import { ProgressService } from './progress.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserLesson])],
  providers: [ProgressService],
  exports: [TypeOrmModule, ProgressService],
})
export class ProgressModule {}
