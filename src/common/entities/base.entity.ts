import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Columns shared by every table. updated_at is also maintained by the
// set_updated_at trigger, so raw SQL updates stay correct.
export abstract class TimestampedEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

export abstract class AppBaseEntity extends TimestampedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
