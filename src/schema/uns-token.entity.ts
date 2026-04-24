import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from 'typeorm'

/**
 * Mirror of the `uns_tokens` table owned by the `uns-record-indexer`
 * microservice. The api-service connects to that database with a read-only
 * role; migrations remain authoritative in the indexer repository.
 *
 * Source of truth:
 * https://github.com/anyone-protocol/uns-record-indexer/blob/master/src/indexer/entities/uns-token.entity.ts
 */
@Entity('uns_tokens')
@Unique(['tokenId'])
@Index(['owner'])
@Index(['name'])
export class UnsTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 128 })
  tokenId!: string

  @Column({ type: 'varchar', length: 253 })
  name!: string

  @Column({ type: 'varchar', length: 42 })
  owner!: string

  @Column({ type: 'varchar', length: 66 })
  lastTransactionHash!: string

  @Column({ type: 'int', default: 0 })
  lastBlockNumber!: number

  @Column({ type: 'int', default: 0 })
  lastLogIndex!: number

  @Column({ type: 'int', default: 0 })
  lastTransactionIndex!: number

  @Column({ type: 'int', nullable: true })
  mintedAtBlock!: number | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
