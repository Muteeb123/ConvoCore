<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class UserSeeder extends Seeder
{
    public function run()
    {
        // 1. Create Admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('Admin@12345'),
                'role_id' => 0, // Admin
            ]
        );

        // 2. Get all permissions excluding "create/update/delete users"
        $excluded = ['create_users', 'update_users', 'delete_users'];
        $availablePermissions = Permission::whereNotIn('description', $excluded)
            ->pluck('id')
            ->toArray();

        // Track created role combinations
        $roleCache = [];

        // 3. Generate 50 random users
        for ($i = 1; $i <= 50; $i++) {
            // Pick random subset of permissions
            $randomCount = rand(2, count($availablePermissions)); // at least 2 perms
            $randomPermissions = collect($availablePermissions)->random($randomCount)->values()->toArray();
            sort($randomPermissions); // ensure order for uniqueness

            $key = implode(',', $randomPermissions);

            // Check if role already exists
            if (isset($roleCache[$key])) {
                $roleId = $roleCache[$key];
            } else {
                // Create new role
                $nextRoleId = Role::max('id') + 1;
                $role = Role::create([
                    'id' => $nextRoleId,
                    'name' => "Role_{$nextRoleId}",
                    'permission_ids' => json_encode($randomPermissions),
                ]);
                $roleId = $role->id;

                // Cache it
                $roleCache[$key] = $roleId;
            }

            // Create user
            User::create([
                'name' => "User {$i}",
                'email' => "user{$i}@example.com",
                'password' => Hash::make('12345678'),
                'role_id' => $roleId,
            ]);
        }
    }
}
