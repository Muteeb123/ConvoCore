<?php

namespace App\Http\Controllers;

use App\Mail\AccountDeletedMail;
use App\Models\User;
use App\Models\Permission;
use App\Models\Role;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\NewUserPassword;
use Illuminate\Support\Facades\Log;

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

        // Ensure role permission_ids is always decoded to array
        if ($user->role && $user->role->permission_ids) {
            $permissionIds = is_string($user->role->permission_ids)
                ? json_decode($user->role->permission_ids, true)
                : $user->role->permission_ids;

            $permissionIds = $permissionIds ?? []; // fallback to empty array
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

    // Fetch roles
    $roles = Role::orderBy('id')->get(['id', 'name', 'permission_ids']);

    // Decode permission_ids for each role and log
    foreach ($roles as $role) {
        $permissionIds = is_string($role->permission_ids)
            ? json_decode($role->permission_ids, true)
            : $role->permission_ids;

        $permissionIds = $permissionIds ?? [];

        $type = gettype($permissionIds);
        $length = count($permissionIds);

        Log::info("Role: {$role->name} | Type: {$type} | Length: {$length}");

        // Ensure frontend gets array, not string
        $role->permission_ids = $permissionIds;
    }

    // Fetch permissions
    $permissions = Permission::orderBy('id')->get(['id', 'description']);

    // Return Inertia response
    return Inertia::render('Users', [
        'users' => $users,
        'roles' => $roles,
        'permissions' => $permissions,
    ]);
}


    /**
     * Store a newly created user (admin only).
     */
    public function store(Request $request)
    {
        Log::info('UserController@store called', ['actor_id' => $request->user()?->id ?? null, 'payload' => $request->only('email','name')]);
        // Only allow admins (role_id === 0) to create users
        $authUser = $request->user();
        if (! $authUser || ($authUser->role_id !== 0 && $authUser->role_id !== null)) {
            Log::warning('UserController@store forbidden', ['actor_id' => $request->user()?->id ?? null]);
            abort(403, 'Forbidden');
        }

        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
                'regex:/@gmail\.com$/i',
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'role_id' => ['nullable','integer','exists:roles,id'],
        ]);

        $plainPassword = Str::random(12);

        $user = User::create([
            'name' => $validated['name'] ?? explode('@', $validated['email'])[0],
            'email' => $validated['email'],
            'password' => Hash::make($plainPassword),
            'role_id' => $validated['role_id'] ?? 1, // default to Basic User
        ]);

        // Send email with the generated password
        try {
            Mail::to($user->email)->send(new NewUserPassword($user, $plainPassword));
            Log::info('New user password emailed', ['email' => $user->email]);
            return redirect()->back()->with('success', 'User created and password emailed.');
        } catch (\Exception $e) {
            Log::error('Failed to send new user email', ['email' => $user->email, 'error' => $e->getMessage()]);
            // Still return success for creation, but notify admin there's an email problem
            return redirect()->back()->with('error', 'User created but failed to send email. Check logs for details.');
        }
    }

    /**
     * Remove the specified user (admin only).
     */
   
public function destroy(Request $request, User $user)
{
    $authUser = $request->user();
    if (! $authUser || $authUser->role_id !== 0) {
        Log::warning('UserController@destroy forbidden', ['actor_id' => $request->user()?->id ?? null]);
        abort(403, 'Forbidden');
    }

    // Prevent admin from deleting themselves
    if ($authUser->id === $user->id) {
        return redirect()->back()->with('error', 'You cannot delete your own account.');
    }

    $email = $user->email;

    // Send email before deleting
    Mail::to($email)->send(new AccountDeletedMail($email));

    $user->delete();
    Log::info('User deleted by admin', ['actor_id' => $authUser->id, 'deleted_email' => $email]);

    return redirect()->back()->with('success', 'User deleted successfully.');
}
}
