// Domaine: Entité Produit (version minimale pour amorcer la refactorisation)
export interface ProduitProps {
  id: number;
  nom: string;
  prix: number | null;
  quantite: number | null;
  parcelleId: number | null;
  userId: string; // aligné sur schéma DB (text)
  createdAt: Date;
}

export class Produit {
  private props: ProduitProps;
  private constructor(props: ProduitProps) {
    this.props = props;
  }

  static create(props: Omit<ProduitProps, 'createdAt'> & { createdAt?: Date }): Produit {
    return new Produit({ ...props, createdAt: props.createdAt ?? new Date() });
  }

  get id() { return this.props.id; }
  get nom() { return this.props.nom; }
  get prix() { return this.props.prix; }
  get quantite() { return this.props.quantite; }
  get parcelleId() { return this.props.parcelleId; }
  get userId() { return this.props.userId; }
  get createdAt() { return this.props.createdAt; }

  rename(nouveauNom: string) {
    if (!nouveauNom || !nouveauNom.trim()) {
      throw new Error('Nom de produit invalide');
    }
    (this.props as any).nom = nouveauNom.trim();
  }
}
