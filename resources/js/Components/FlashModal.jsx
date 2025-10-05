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

    return (
        <Modal show={show} onClose={() => setShow(false)}>
            <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">{flash.success ? 'Success' : 'Notice'}</h3>
                <div className="mb-4 text-sm text-gray-700">
                    {flash.success || flash.error}
                </div>
                <div className="flex justify-end">
                    <PrimaryButton onClick={() => setShow(false)}>Close</PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
