import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';

export default function Users({ auth, users, roles }) {
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        role_id: '1', // default to Basic User
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

    return (
        <AuthenticatedLayout>
            <Head title="Users" />

            <div className="">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="flex justify-between mb-4">
                                <h2 className="text-lg font-semibold">Users</h2>
                                {(auth?.user?.role_id === 0 || auth?.user?.role_id == null) && (
                                    <PrimaryButton onClick={() => setShowAddModal(true)}>
                                        Add User
                                    </PrimaryButton>
                                )}
                            </div>

                            {/* Users Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full border border-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 border">ID</th>
                                            <th className="px-4 py-2 border">Name</th>
                                            <th className="px-4 py-2 border">Email</th>
                                            <th className="px-4 py-2 border">Role</th>
                                            <th className="px-4 py-2 border">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.data.map((user) => (
                                            <tr key={user.id} className="text-center">
                                                <td className="px-4 py-2 border">{user.id}</td>
                                                <td className="px-4 py-2 border">{user.name}</td>
                                                <td className="px-4 py-2 border">{user.email}</td>
                                                <td className="px-4 py-2 border">{user.role?.name ?? 'N/A'}</td>
                                                <td className="px-4 py-2 border">
                                                    <SecondaryButton
                                                        onClick={() => openRoleModal(user)}
                                                    >
                                                        View Role
                                                    </SecondaryButton>
                                                    {auth?.user?.role_id === 0 && auth?.user?.id !== user.id && (
                                                        <Link
                                                            as="button"
                                                            method="delete"
                                                            href={route('users.destroy', user.id)}
                                                            onClick={(e) => {
                                                                if (
                                                                    !confirm(
                                                                        `Delete user ${user.email}? This action cannot be undone.`,
                                                                    )
                                                                ) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="ml-2"
                                                        >
                                                            <SecondaryButton>Delete</SecondaryButton>
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
            </div>

            {/* Role Modal */}
            <Modal show={showRoleModal} onClose={() => setShowRoleModal(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {selectedUser?.name}'s Permissions
                    </h3>
                    {selectedUser?.role?.permissions?.length ? (
                        <ul className="list-disc pl-6 space-y-1">
                            {selectedUser.role.permissions.map((perm, idx) => (
                                <li key={idx}>{perm}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600">No permissions assigned.</p>
                    )}
                    <div className="mt-4 flex justify-end">
                        <SecondaryButton onClick={() => setShowRoleModal(false)}>
                            Close
                        </SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* Add User Modal */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Add New User</h3>
                    <form className="space-y-4" onSubmit={submitNewUser}>
                        <div>
                            <label className="block text-sm font-medium">Name (optional)</label>
                            <input
                                type="text"
                                className="w-full border rounded px-3 py-2"
                                placeholder="Enter name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && (
                                <div className="text-sm text-red-600 mt-1">{errors.name}</div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Gmail address</label>
                            <input
                                type="email"
                                className="w-full border rounded px-3 py-2"
                                placeholder="user@gmail.com"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            {errors.email && (
                                <div className="text-sm text-red-600 mt-1">{errors.email}</div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Role</label>
                            <select
                                className="w-full border rounded px-3 py-2"
                                value={data.role_id}
                                onChange={(e) => setData('role_id', e.target.value)}
                            >
                                <option value="1">Basic User</option>
                                <option value="0">Admin</option>
                            </select>
                            {errors.role_id && (
                                <div className="text-sm text-red-600 mt-1">{errors.role_id}</div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-2">
                            <SecondaryButton type="button" onClick={() => setShowAddModal(false)}>
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton type="submit" disabled={processing}>
                                Save
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
