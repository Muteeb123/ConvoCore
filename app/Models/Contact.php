<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    //
    protected $fillable = ['customer_id', 'person_name', 'person_contact'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
