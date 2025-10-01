<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            // Users
            'create_users', 'read_users', 'update_users', 'delete_users',

            // Roles
            'create_roles', 'read_roles', 'update_roles', 'delete_roles',

            // Permissions
            'create_permissions', 'read_permissions', 'update_permissions', 'delete_permissions',

            // Leads
            'create_leads', 'read_leads', 'update_leads', 'delete_leads',

            // Opportunities
            'create_opportunities', 'read_opportunities', 'update_opportunities', 'delete_opportunities',

            // Customers
            'create_customers', 'read_customers', 'update_customers', 'delete_customers',

            // Contacts
            'create_contacts', 'read_contacts', 'update_contacts', 'delete_contacts',

            // Tasks
            'create_tasks', 'read_tasks', 'update_tasks', 'delete_tasks',
            'assign_tasks', 'unassign_tasks',
        ];

        foreach ($permissions as $description) {
            Permission::firstOrCreate(['description' => $description]);
        }
    }
}
