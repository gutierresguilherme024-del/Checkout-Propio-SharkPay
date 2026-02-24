import { redirect } from 'next/navigation';

export default function Home() {
    // Usually the home of a checkout system is the admin panel or a landing page
    // For now, let's redirect to admin products to show the new features
    redirect('/admin/products');
}
