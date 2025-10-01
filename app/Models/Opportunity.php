<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Opportunity extends Model
{
    //

     protected $fillable = ['lead_id', 'deadline', 'status'];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
