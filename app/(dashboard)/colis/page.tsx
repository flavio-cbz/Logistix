import { redirect } from 'next/navigation';

export default function ColisPage() {
  // Redirection vers la page parcelles existante
  redirect('/parcelles');
}