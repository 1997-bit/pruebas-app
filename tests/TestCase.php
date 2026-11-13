<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Artisan;

abstract class TestCase extends BaseTestCase
{
    /**
     * RefreshDatabase sin reconstruir el esquema en cada ejecución.
     *
     * RefreshDatabase corre migrate:fresh una vez por proceso: borra y vuelve a crear todas las tablas,
     * unos 800 ms en MariaDB aunque nada haya cambiado. Aquí corre `migrate`, que no hace nada si la base
     * ya está al día, y le dice a RefreshDatabase que ya migró: solo abre su transacción por prueba.
     * Cada prueba sigue viendo la base limpia.
     *
     * Si cambia una migración que ya corrió: DB_DATABASE=pruebas_app_test php artisan migrate:fresh
     */
    protected function setUpTraits()
    {
        if (! RefreshDatabaseState::$migrated && in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            Artisan::call('migrate', ['--force' => true]);
            RefreshDatabaseState::$migrated = true;
        }

        return parent::setUpTraits();
    }
}
