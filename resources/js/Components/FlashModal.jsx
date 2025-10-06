import { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import { usePage } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

export default function FlashModal() {
    const flash = usePage().props.flash || {};
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (flash.success || flash.error) {
            setShow(true);
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

    return (
        <Modal show={show} onClose={() => setShow(false)} maxWidth="md">
            <div className="p-6">
                <div className="sm:flex sm:items-start">
                    {getIcon()}
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className={`text-lg leading-6 font-medium ${getTitleColor()}`}>
                            {getTitle()}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-600">
                                {flash.success || flash.error}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <PrimaryButton
                        onClick={() => setShow(false)}
                        className="w-full sm:w-auto sm:text-sm"
                    >
                        Close
                    </PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}