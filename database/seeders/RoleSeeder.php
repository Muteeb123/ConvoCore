<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use App\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run()
    {
        // All permissions
        $allPermissions = Permission::pluck('id')->toArray();

        // Read-only permissions
        $readPermissions = Permission::where('description', 'LIKE', 'read_%')->pluck('id')->toArray();

        // Admin Role (id = 0)
        Role::firstOrCreate(
            ['id' => 0],
            [
                'name' => 'Admin',
                'permission_ids' => json_encode($allPermissions),
            ]
        );

        // Basic User Role (id = 1)
        Role::firstOrCreate(
            ['id' => 1],
            [
                'name' => 'Basic User',
                'permission_ids' => json_encode($readPermissions),
            ]
        );
    }
}
