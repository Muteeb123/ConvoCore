import ApplicationLogo from '@/Components/ApplicationLogo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import FlashModal from '@/Components/FlashModal';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const flash = usePage().props.flash || {};

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar Navigation */}
            <nav className="w-64 bg-card shadow-lg flex flex-col border-r">
                {/* Logo Section */}
                <div className="p-4 border-b">
                    <Link href="/" className="flex items-center">
                        <ApplicationLogo className="h-8 w-auto fill-current text-foreground" />
                        <span className="ml-3 text-xl font-semibold">ConvoCore</span>
                    </Link>
                </div>

                {/* Main Navigation Links */}
                <div className="flex-1 px-4 py-6">
                    <div className="space-y-2">
                        <Link href={route('dashboard')} className={`flex items-center px-3 py-2 rounded-lg transition-colors ${route().current('dashboard') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                        </Link>
                        <Link href={route('users')} className={`flex items-center px-3 py-2 rounded-lg transition-colors ${route().current('users') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            Users
                        </Link>
                    </div>
                </div>

                {/* User Section */}
                <div className="p-4 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start px-3 py-2">
                                <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3 flex-1 text-left">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('profile.edit')}>Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={route('logout')} method="post" as="button" className="text-destructive">Log Out</Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {/* Mobile header with hamburger menu */}
                <div className="lg:hidden bg-card border-b">
                    <div className="flex items-center justify-between p-4">
                        <button
                            onClick={() => setShowingNavigationDropdown((previousState) => !previousState)}
                            className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted"
                        >
                            <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                <path
                                    className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                                <path
                                    className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                        <Link href="/">
                            <ApplicationLogo className="h-8 w-auto fill-current" />
                        </Link>
                        <div className="w-10"></div> {/* Spacer for balance */}
                    </div>

                    {/* Mobile navigation dropdown */}
                    <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' border-t'}>
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            <Link href={route('dashboard')} className="block px-3 py-2 rounded-md hover:bg-muted">Dashboard</Link>
                            <Link href={route('users')} className="block px-3 py-2 rounded-md hover:bg-muted">Users</Link>
                        </div>
                        <div className="pt-4 pb-3 border-t border-gray-200">
                            <div className="px-4">
                                <div className="text-base font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                            <div className="mt-3 px-2 space-y-1">
                                <Link href={route('profile.edit')} className="block px-3 py-2 rounded-md hover:bg-muted">Profile</Link>
                                <Link method="post" href={route('logout')} as="button" className="block px-3 py-2 rounded-md text-destructive">Log Out</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page header */}
                {header && (
                    <header className="bg-card shadow-sm">
                        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Main content */}
                <main className="flex-1 py-6">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {/* Flash messages */}
                        {flash.success && (
                            <div className="mb-6 rounded-md bg-green-50 p-4">
                                <div className="flex">
                                    <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-green-700">{flash.success}</div>
                                </div>
                            </div>
                        )}
                        {flash.error && (
                            <div className="mb-6 rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <svg className="h-5 w-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="text-sm text-red-700">{flash.error}</div>
                                </div>
                            </div>
                        )}

                        {children}
                        <FlashModal />
                    </div>
                </main>
            </div>
        </div>
    );
}