import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';

export default function Dashboard() {
    return (
        <AuthenticatedLayout

        >
            <Head title="Dashboard" />

            <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                <Card>
                    <CardContent className="p-6">
                        You're logged in!
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
