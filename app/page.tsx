import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect to protected page
  redirect('/protected');
}
