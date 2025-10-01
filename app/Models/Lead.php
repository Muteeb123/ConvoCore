<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    //

    protected $fillable = [
        'company_name',
        'link',
        'contact',
        'description',
        'status',
    ];

    public function opportunity()
    {
        return $this->hasOne(Opportunity::class);
    }
}
