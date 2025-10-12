import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Welcome({ auth, laravelVersion, phpVersion }) {

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Card className="w-full max-w-2xl">
                    <CardContent className="p-8 text-center">
                        <h1 className="text-3xl font-semibold mb-2">Welcome to ConvoCore</h1>
                        <p className="text-muted-foreground mb-6">Please log in to continue.</p>
                        <Link href={route('login')}>
                            <Button className="bg-primary text-primary-foreground">Log in</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
