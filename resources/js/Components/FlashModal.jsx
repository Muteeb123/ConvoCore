import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useToast } from '@/hooks/use-toast';

export default function FlashModal() {
    const flash = usePage().props.flash || {};
    const { toast } = useToast();

    useEffect(() => {
        if (flash.success) {
            toast({ title: 'Success', description: flash.success });
        } else if (flash.error) {
            toast({ title: 'Error', description: flash.error, variant: 'destructive' });
        }
    }, [flash.success, flash.error]);

    const getIcon = () => {
        if (flash.success) {
            return (
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            );
        }
        if (flash.error) {
            return (
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            );
        }
        return null;
    };

    const getTitle = () => {
        if (flash.success) return 'Success!';
        if (flash.error) return 'Error!';
        return 'Notice';
    };

    const getTitleColor = () => {
        if (flash.success) return 'text-green-900';
        if (flash.error) return 'text-red-900';
        return 'text-gray-900';
    };

    return null;
}