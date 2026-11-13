<?php

use App\Support\Icono;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('iconos', function () {
    $this->info(Icono::generar().' íconos en resources/iconos.php');
})->purpose('Limpia los SVG de la librería y los deja listos para @icono');
