import { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Users({ auth, users, roles: initialRoles, permissions }) {
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [roles, setRoles] = useState(initialRoles); // local copy for dynamic updates
    const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
    const [newRoleName, setNewRoleName] = useState('');
    const [duplicateRole, setDuplicateRole] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        role_id: roles[1]?.id || '', // default to first role
    });

    const openRoleModal = (user) => {
        setSelectedUser(user);
        setShowRoleModal(true);
    };

    const submitNewUser = (e) => {
        e.preventDefault();
        post(route('users.store'), {
            onSuccess: () => {
                setShowAddModal(false);
                reset();
            },
        });
    };

    // Compare arrays regardless of order
    const arraysEqualSet = (a, b) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort((x, y) => x - y);
        const sortedB = [...b].sort((x, y) => x - y);
        return JSON.stringify(sortedA) === JSON.stringify(sortedB);
    };

    // Check for duplicate role whenever selectedPermissionIds changes
    useEffect(() => {
        const duplicate = roles.find((role) =>
            arraysEqualSet(role.permission_ids, selectedPermissionIds)
        );
        setDuplicateRole(duplicate || null);
    }, [selectedPermissionIds, roles]);

    const submitNewRole = async (e) => {
        e.preventDefault();

        if (!newRoleName) return;

        try {
            const response = await fetch(route('roles.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Inertia': 'true', // Optional if using Inertia headers
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({
                    name: newRoleName,
                    permission_ids: selectedPermissionIds,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const createdRole = data.role;
                setRoles([...roles, createdRole]);
                setShowCreateRoleModal(false);
                setNewRoleName('');
                setSelectedPermissionIds([]);
                setDuplicateRole(null);
            } else if (response.status === 422) {
                const errorData = await response.json();
                if (errorData.role) {
                    setDuplicateRole(errorData.role); // duplicate role detected
                } else {
                    console.error('Validation errors:', errorData.errors);
                }
            } else {
                const errorText = await response.text();
                console.error('Unexpected error:', errorText);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };



    const togglePermission = (id) => {
        setSelectedPermissionIds((prev) =>
            prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Users" />

            <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                    <div className="p-6 text-gray-900">
                        <div className="flex justify-between mb-4">
                            <h2 className="text-lg font-semibold">Users</h2>
                            {(auth?.user?.role_id === 0 || auth?.user?.role_id == null) && (
                                <Button onClick={() => setShowAddModal(true)}>
                                    Add User
                                </Button>
                            )}
                        </div>

                        {/* Users Table */}
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>{user.id}</TableCell>
                                            <TableCell>{user.name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.role?.name ?? 'N/A'}</TableCell>
                                            <TableCell>
                                                <Button variant="secondary" onClick={() => openRoleModal(user)}>View Role</Button>
                                                {auth?.user?.role_id === 0 && auth?.user?.id !== user.id && (
                                                    <Button asChild variant="destructive" className="ml-2">
                                                        <Link
                                                            method="delete"
                                                            href={route('users.destroy', user.id)}
                                                            onClick={(e) => {
                                                                if (!confirm(`Delete user ${user.email}? This action cannot be undone.`)) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-center mt-4 space-x-2">
                            {users.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 border rounded ${link.active
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100'
                                        } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Role Modal */}
            {showRoleModal && (
                <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{selectedUser?.name}'s Permissions</DialogTitle>
                        </DialogHeader>
                        {selectedUser?.role?.permissions?.length ? (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {selectedUser.role.permissions.map((perm, idx) => (
                                    <span
                                        key={idx}
                                        className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full"
                                    >
                                        {perm}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground mb-4">No permissions assigned.</p>
                        )}
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}


            {/* Add User Modal */}
            {showAddModal && (
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                        </DialogHeader>
                        <form className="space-y-5" onSubmit={submitNewUser}>
                        {/* Name */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && <div className="text-sm text-red-600 mt-1">{errors.name}</div>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
                            <input
                                type="email"
                                className="w-full border border-gray-300 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="user@gmail.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email}</div>}
                        </div>

                        {/* Role */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Role</label>
                            <div className="flex gap-3">
                                <select
                                    className="flex-1 border border-gray-300 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={data.role_id}
                                    onChange={(e) => setData('role_id', e.target.value)}
                                >
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    type="button"
                                    onClick={() => setShowCreateRoleModal(true)}
                                    className="whitespace-nowrap px-4 py-2"
                                >
                                    Create New Role
                                </Button>
                            </div>
                            {errors.role_id && <div className="text-sm text-red-600 mt-1">{errors.role_id}</div>}
                        </div>

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2"
                            >
                                {processing ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Create Role Modal */}
            {showCreateRoleModal && (
                <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Role</DialogTitle>
                        </DialogHeader>
                        <form className="space-y-5" onSubmit={submitNewRole}>
                        {/* Role Name */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-1">Role Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter role name"
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Permissions */}
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 mb-2">Permissions</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 p-3 rounded-md bg-gray-50">
                                {permissions.map((perm) => (
                                    <label key={perm.id} className="flex items-center space-x-2 text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={selectedPermissionIds.includes(perm.id)}
                                            onChange={() => togglePermission(perm.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm">{perm.description}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Duplicate role message */}
                        {duplicateRole && (
                            <p className="text-red-600 text-sm mt-1">
                                Already exists: {duplicateRole.name}
                            </p>
                        )}

                        {/* Buttons */}
                        <div className="flex justify-end space-x-3 mt-4">
                            <Button type="button" variant="secondary" onClick={() => setShowCreateRoleModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newRoleName || duplicateRole}>
                                Create
                            </Button>
                        </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

        </AuthenticatedLayout>
    );
}
