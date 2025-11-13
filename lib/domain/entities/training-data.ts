/**
 * TrainingData Entity
 * Represents a labeled captcha image for model training
 */

export type AnnotationSource = 'manual' | 'automatic' | 'validated';

export interface TrainingDataProps {
  id: string;
  attemptId: string;
  imageUrl: string;
  puzzlePieceUrl?: string;
  gapPosition: number;
  annotationSource: AnnotationSource;
  annotatedBy?: string;
  annotatedAt: string;
  isValidated: boolean;
  metadata?: Record<string, unknown>;
}

export class TrainingData {
  private readonly props: TrainingDataProps;

  constructor(props: TrainingDataProps) {
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }

  get attemptId(): string {
    return this.props.attemptId;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get puzzlePieceUrl(): string | undefined {
    return this.props.puzzlePieceUrl;
  }

  get gapPosition(): number {
    return this.props.gapPosition;
  }

  get annotationSource(): AnnotationSource {
    return this.props.annotationSource;
  }

  get annotatedBy(): string | undefined {
    return this.props.annotatedBy;
  }

  get annotatedAt(): string {
    return this.props.annotatedAt;
  }

  get isValidated(): boolean {
    return this.props.isValidated;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata;
  }

  /**
   * Validate the training data (after manual review)
   */
  validate(validatedBy: string): TrainingData {
    return new TrainingData({
      ...this.props,
      isValidated: true,
      annotatedBy: validatedBy,
      metadata: {
        ...this.props.metadata,
        validatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Update gap position (manual correction)
   */
  updateGapPosition(newPosition: number, correctedBy: string): TrainingData {
    return new TrainingData({
      ...this.props,
      gapPosition: newPosition,
      annotationSource: 'manual',
      annotatedBy: correctedBy,
      isValidated: true,
      metadata: {
        ...this.props.metadata,
        correctedAt: new Date().toISOString(),
        originalPosition: this.props.gapPosition,
      },
    });
  }

  toJSON(): TrainingDataProps {
    return { ...this.props };
  }
}
