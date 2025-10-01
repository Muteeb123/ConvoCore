<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    //

    protected $fillable = [
        'assigned_to',
        'customer_id',
        'status',
        'deadline',
        'description',
        'assigned_by',
        'priority',
    ];

    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
