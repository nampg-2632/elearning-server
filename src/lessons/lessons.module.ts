import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminLessonsController } from './admin-lessons.controller';
import { AdminLessonsService } from './admin-lessons.service';
import { Lesson } from './entities/lesson.entity';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  controllers: [AdminLessonsController, LessonsController],
  providers: [LessonsService, AdminLessonsService],
  exports: [TypeOrmModule, LessonsService],
})
export class LessonsModule {}
