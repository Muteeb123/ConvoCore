<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Permission;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a paginated listing of users.
     */
    public function index()
    {
        // Paginate users
        $users = User::with('role')->paginate(8)->through(function ($user) {
            $permissions = [];

            if ($user->role && $user->role->permission_ids) {
                $permissionIds = json_decode($user->role->permission_ids, true);
                $permissions = Permission::whereIn('id', $permissionIds)
                    ->pluck('description')
                    ->toArray();
            }

            return [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => [
                    'id'          => $user->role->id ?? null,
                    'name'        => $user->role->name ?? null,
                    'permissions' => $permissions,
                ],
            ];
        });

        return Inertia::render('Users', [
            'users' => $users,
        ]);
    }
}
