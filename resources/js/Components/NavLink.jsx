import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 focus:bg-indigo-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900') +
                className
            }
        >
            {children}
        </Link>
    );
}