import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonWord } from './entities/lesson-word.entity';
import { Word } from './entities/word.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Word, LessonWord])],
  exports: [TypeOrmModule],
})
export class WordsModule {}
