/**
 * CaptchaAttempt Entity
 * Represents a single captcha solving attempt with its result
 */

export type CaptchaStatus = 'pending' | 'success' | 'failure';
export type CaptchaType = 'slider';

export interface CaptchaAttemptProps {
  id: string;
  userId: string;
  imageUrl: string;
  puzzlePieceUrl?: string;
  detectedPosition: number;
  actualPosition?: number;
  confidence: number;
  status: CaptchaStatus;
  attemptedAt: string;
  solvedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export class CaptchaAttempt {
  private readonly props: CaptchaAttemptProps;

  constructor(props: CaptchaAttemptProps) {
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get puzzlePieceUrl(): string | undefined {
    return this.props.puzzlePieceUrl;
  }

  get detectedPosition(): number {
    return this.props.detectedPosition;
  }

  get actualPosition(): number | undefined {
    return this.props.actualPosition;
  }

  get confidence(): number {
    return this.props.confidence;
  }

  get status(): CaptchaStatus {
    return this.props.status;
  }

  get attemptedAt(): string {
    return this.props.attemptedAt;
  }

  get solvedAt(): string | undefined {
    return this.props.solvedAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  /**
   * Mark the attempt as successful
   */
  markAsSuccess(actualPosition: number): CaptchaAttempt {
    return new CaptchaAttempt({
      ...this.props,
      status: 'success',
      actualPosition,
      solvedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark the attempt as failed
   */
  markAsFailed(errorMessage: string): CaptchaAttempt {
    return new CaptchaAttempt({
      ...this.props,
      status: 'failure',
      errorMessage,
      solvedAt: new Date().toISOString(),
    });
  }

  /**
   * Calculate accuracy percentage if actual position is known
   */
  getAccuracy(): number | null {
    if (this.props.actualPosition === undefined) {
      return null;
    }
    const error = Math.abs(this.props.detectedPosition - this.props.actualPosition);
    // Assume max error of 50 pixels for 0% accuracy
    const accuracy = Math.max(0, 100 - (error / 50) * 100);
    return accuracy;
  }

  /**
   * Check if attempt was successful based on tolerance
   */
  isSuccessful(tolerance: number = 5): boolean {
    if (this.props.status !== 'success' || this.props.actualPosition === undefined) {
      return false;
    }
    const error = Math.abs(this.props.detectedPosition - this.props.actualPosition);
    return error <= tolerance;
  }

  toJSON(): CaptchaAttemptProps {
    return { ...this.props };
  }
}
