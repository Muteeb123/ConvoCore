<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class SendPasswordController extends Controller
{
    public function sendPassword(Request $request)
    {
    
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

    
        $email = $request->email;
        $password = $request->password;

    
        Mail::raw("Your password is: $password", function ($message) use ($email) {
            $message->to($email)
                    ->subject('Your Password');
        });

    
        return response()->json(['message' => 'Password sent successfully']);
    }
}
