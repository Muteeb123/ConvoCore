import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-background pt-6 sm:justify-center sm:pt-0">
            <div>
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-foreground" />
                </Link>
            </div>
            <Card className="mt-6 w-full sm:max-w-md">
                <CardContent className="px-6 py-6">
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}
