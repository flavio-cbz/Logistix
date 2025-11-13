/**
 * SQLite implementation of CaptchaAttemptRepository
 */

import { eq, desc, and } from 'drizzle-orm';
import { db } from '@/lib/database/db';
import { captchaAttempts } from '@/lib/database/schema';
import type { CaptchaAttemptRepository } from '@/lib/repositories/captcha-attempt-repository';
import { CaptchaAttempt } from '@/lib/domain/entities/captcha-attempt';
import type { CaptchaStatus } from '@/lib/domain/entities/captcha-attempt';

export class SQLiteCaptchaAttemptRepository implements CaptchaAttemptRepository {
  async create(attempt: CaptchaAttempt): Promise<CaptchaAttempt> {
    const data = attempt.toJSON();
    await db.insert(captchaAttempts).values({
      id: data.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      puzzlePieceUrl: data.puzzlePieceUrl,
      detectedPosition: data.detectedPosition,
      actualPosition: data.actualPosition,
      confidence: data.confidence,
      status: data.status,
      attemptedAt: data.attemptedAt,
      solvedAt: data.solvedAt,
      errorMessage: data.errorMessage,
      metadata: data.metadata,
    });
    return attempt;
  }

  async findById(id: string): Promise<CaptchaAttempt | null> {
    const results = await db
      .select()
      .from(captchaAttempts)
      .where(eq(captchaAttempts.id, id))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.toDomain(results[0]);
  }

  async findByUserId(userId: string, limit: number = 100): Promise<CaptchaAttempt[]> {
    const results = await db
      .select()
      .from(captchaAttempts)
      .where(eq(captchaAttempts.userId, userId))
      .orderBy(desc(captchaAttempts.attemptedAt))
      .limit(limit);

    return results.map((r) => this.toDomain(r));
  }

  async findByStatus(status: CaptchaStatus, limit: number = 100): Promise<CaptchaAttempt[]> {
    const results = await db
      .select()
      .from(captchaAttempts)
      .where(eq(captchaAttempts.status, status))
      .orderBy(desc(captchaAttempts.attemptedAt))
      .limit(limit);

    return results.map((r) => this.toDomain(r));
  }

  async update(attempt: CaptchaAttempt): Promise<CaptchaAttempt> {
    const data = attempt.toJSON();
    await db
      .update(captchaAttempts)
      .set({
        detectedPosition: data.detectedPosition,
        actualPosition: data.actualPosition,
        confidence: data.confidence,
        status: data.status,
        solvedAt: data.solvedAt,
        errorMessage: data.errorMessage,
        metadata: data.metadata,
      })
      .where(eq(captchaAttempts.id, data.id));

    return attempt;
  }

  async getSuccessRate(userId: string): Promise<number> {
    const results = await db
      .select()
      .from(captchaAttempts)
      .where(eq(captchaAttempts.userId, userId));

    if (results.length === 0) {
      return 0;
    }

    const successfulAttempts = results.filter((r) => r.status === 'success').length;
    return (successfulAttempts / results.length) * 100;
  }

  async findRecent(limit: number, offset: number): Promise<CaptchaAttempt[]> {
    const results = await db
      .select()
      .from(captchaAttempts)
      .orderBy(desc(captchaAttempts.attemptedAt))
      .limit(limit)
      .offset(offset);

    return results.map((r) => this.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await db.delete(captchaAttempts).where(eq(captchaAttempts.id, id));
  }

  private toDomain(row: typeof captchaAttempts.$inferSelect): CaptchaAttempt {
    return new CaptchaAttempt({
      id: row.id,
      userId: row.userId,
      imageUrl: row.imageUrl,
      puzzlePieceUrl: row.puzzlePieceUrl ?? undefined,
      detectedPosition: row.detectedPosition,
      actualPosition: row.actualPosition ?? undefined,
      confidence: row.confidence,
      status: row.status,
      attemptedAt: row.attemptedAt,
      solvedAt: row.solvedAt ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      metadata: row.metadata ?? undefined,
    });
  }
}
