<?php

use Illuminate\Support\Facades\Route;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Spatie\PrometheusExporter\Facades\PrometheusExporter;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/up', function () {
    Log::notice("Start get Users from database");
    $user = User::all();
    Log::error("This special message is for the error log");
    return response()->json($user);
});
