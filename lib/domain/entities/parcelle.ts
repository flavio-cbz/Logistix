export interface ParcelleProps {
  id: string;
  userId: string;
  numero: string;
  transporteur: string;
  nom: string;
  statut: string;
  actif: boolean;
  prixAchat: number | null;
  poids: number | null;
  prixTotal: number | null;
  prixParGramme: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Parcelle {
  private props: ParcelleProps;

  private constructor(props: ParcelleProps) {
    this.props = props;
  }

  static create(
    props: Omit<ParcelleProps, 'createdAt' | 'updatedAt'> & {
      createdAt?: Date;
      updatedAt?: Date;
    },
  ): Parcelle {
    const now = new Date();
    return new Parcelle({
      ...props,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get numero() { return this.props.numero; }
  get transporteur() { return this.props.transporteur; }
  get nom() { return this.props.nom; }
  get statut() { return this.props.statut; }
  get actif() { return this.props.actif; }
  get prixAchat() { return this.props.prixAchat; }
  get poids() { return this.props.poids; }
  get prixTotal() { return this.props.prixTotal; }
  get prixParGramme() { return this.props.prixParGramme; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }
}
