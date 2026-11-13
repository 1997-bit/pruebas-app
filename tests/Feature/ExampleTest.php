<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Large;
use Tests\TestCase;

// Enunciado, paso 1: la prueba de ejemplo que trae Laravel
#[CoversNothing]
#[Large]
#[Group('smoke')]
final class ExampleTest extends TestCase
{
    // La página de pruebas lee la base: sin migrar, depende de que otra prueba migre antes
    use RefreshDatabase;

    public function testInicioRespondeOk(): void
    {
        $respuesta = $this->get('/');

        $respuesta->assertStatus(200);
    }
}
