/**
 * SQLite implementation of TrainingDataRepository
 */

import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/database/db';
import { trainingData } from '@/lib/database/schema';
import type { TrainingDataRepository } from '@/lib/repositories/training-data-repository';
import { TrainingData } from '@/lib/domain/entities/training-data';
import type { AnnotationSource } from '@/lib/domain/entities/training-data';

export class SQLiteTrainingDataRepository implements TrainingDataRepository {
  async create(data: TrainingData): Promise<TrainingData> {
    const props = data.toJSON();
    await db.insert(trainingData).values({
      id: props.id,
      attemptId: props.attemptId,
      imageUrl: props.imageUrl,
      puzzlePieceUrl: props.puzzlePieceUrl,
      gapPosition: props.gapPosition,
      annotationSource: props.annotationSource,
      annotatedBy: props.annotatedBy,
      annotatedAt: props.annotatedAt,
      isValidated: props.isValidated,
      metadata: props.metadata,
    });
    return data;
  }

  async findById(id: string): Promise<TrainingData | null> {
    const results = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.id, id))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.toDomain(results[0]);
  }

  async findByAttemptId(attemptId: string): Promise<TrainingData | null> {
    const results = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.attemptId, attemptId))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.toDomain(results[0]);
  }

  async findValidated(limit: number = 1000): Promise<TrainingData[]> {
    const results = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.isValidated, true))
      .orderBy(desc(trainingData.annotatedAt))
      .limit(limit);

    return results.map((r: typeof trainingData.$inferSelect) => this.toDomain(r));
  }

  async findUnvalidated(limit: number = 100): Promise<TrainingData[]> {
    const results = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.isValidated, false))
      .orderBy(desc(trainingData.annotatedAt))
      .limit(limit);

    return results.map((r: typeof trainingData.$inferSelect) => this.toDomain(r));
  }

  async findBySource(source: AnnotationSource, limit: number = 100): Promise<TrainingData[]> {
    const results = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.annotationSource, source))
      .orderBy(desc(trainingData.annotatedAt))
      .limit(limit);

    return results.map((r: typeof trainingData.$inferSelect) => this.toDomain(r));
  }

  async update(data: TrainingData): Promise<TrainingData> {
    const props = data.toJSON();
    await db
      .update(trainingData)
      .set({
        gapPosition: props.gapPosition,
        annotationSource: props.annotationSource,
        annotatedBy: props.annotatedBy,
        isValidated: props.isValidated,
        metadata: props.metadata,
      })
      .where(eq(trainingData.id, props.id));

    return data;
  }

  async count(): Promise<number> {
    const results = await db.select().from(trainingData);
    return results.length;
  }

  async countValidated(): Promise<number> {
    const results = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.isValidated, true));
    return results.length;
  }

  async delete(id: string): Promise<void> {
    await db.delete(trainingData).where(eq(trainingData.id, id));
  }

  private toDomain(row: typeof trainingData.$inferSelect): TrainingData {
    return new TrainingData({
      id: row.id,
      attemptId: row.attemptId,
      imageUrl: row.imageUrl,
      puzzlePieceUrl: row.puzzlePieceUrl ?? undefined,
      gapPosition: row.gapPosition,
      annotationSource: row.annotationSource,
      annotatedBy: row.annotatedBy ?? undefined,
      annotatedAt: row.annotatedAt,
      isValidated: row.isValidated,
      metadata: row.metadata ?? undefined,
    });
  }
}
