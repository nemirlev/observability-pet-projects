<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Cache;

class RequestMetricsMiddleware
{
    public function handle($request, Closure $next)
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = microtime(true) - $start;

        Cache::increment('http_requests_total');

        return $response;
    }
}
