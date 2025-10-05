<div style="font-family: sans-serif; line-height: 1.4; color: #111;">
    <p>Hello {{ $user->name }},</p>

    <p>An account has been created for you on {{ config('app.name') }}. You can log in using the credentials below:</p>

    <ul>
        <li><strong>Email:</strong> {{ $user->email }}</li>
        <li><strong>Password:</strong> {{ $password }}</li>
    </ul>

    <p>For security, please change your password after first login by visiting your profile page.</p>

    <p>Regards,<br>{{ config('app.name') }}</p>
</div>
