export interface UserProps {
  id: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private props: UserProps;
  private constructor(props: UserProps) { this.props = props; }
  static create(props: Omit<UserProps, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }): User {
    const now = new Date();
    return new User({ ...props, createdAt: props.createdAt ?? now, updatedAt: props.updatedAt ?? now });
  }
  get id() { return this.props.id; }
  get username() { return this.props.username; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }
  rename(newName: string) {
    if (!newName || !newName.trim()) throw new Error('Nom utilisateur invalide');
    (this.props as any).username = newName.trim();
    (this.props as any).updatedAt = new Date();
  }
}
