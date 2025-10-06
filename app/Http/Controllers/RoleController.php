<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Store a newly created role.
     */
public function store(Request $request)
{
    \Log::info('Role store request received', $request->all());

    $request->validate([
        'name' => 'required|string|max:255',
        'permission_ids' => 'required|array',
        'permission_ids.*' => 'integer|exists:permissions,id',
    ]);

    $permissionIds = $request->input('permission_ids');
    \Log::info('Permissions received', $permissionIds);

    $existingRole = Role::all()->first(function ($role) use ($permissionIds) {
        $existingPermissions = $role->permission_ids;

        if (is_string($existingPermissions)) {
            $existingPermissions = json_decode($existingPermissions, true) ?? [];
        }

        sort($existingPermissions);
        $ids = $permissionIds;
        sort($ids);

        return $existingPermissions === $ids;
    });

    if ($existingRole) {
        \Log::info('Duplicate role detected', [
            'existing_role_id' => $existingRole->id,
            'existing_role_name' => $existingRole->name,
            'existing_permissions' => $existingRole->permission_ids
        ]);

        return response()->json([
            'message' => 'Role with the same permissions already exists.',
            'role' => $existingRole
        ], 422);
    }

    $role = Role::create([
        'name' => $request->input('name'),
        'permission_ids' => $permissionIds, // casted to JSON automatically
    ]);

    \Log::info('New role created successfully', [
        'role_id' => $role->id,
        'role_name' => $role->name,
        'permissions' => $role->permission_ids
    ]);

    return response()->json([
        'message' => 'Role created successfully.',
        'role' => $role
    ]);
}


}
