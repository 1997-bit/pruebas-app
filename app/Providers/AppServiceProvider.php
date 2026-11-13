<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // @icono('trash-2') o @icono('sun', 'tema-sol'): una búsqueda en una tabla, sin componente Blade
        Blade::directive('icono', fn (string $argumentos) => "<?php echo \\App\\Support\\Icono::svg({$argumentos}); ?>");
    }
}
