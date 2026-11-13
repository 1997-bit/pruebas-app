<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Large;
use Tests\TestCase;

// Enunciado, paso 3: actingAs
#[CoversNothing]
#[Large]
#[Group('sistema')]
final class PerfilTest extends TestCase
{
    use RefreshDatabase;

    #[Group('seguridad')]
    public function testInvitadoNoVeElPerfil(): void
    {
        $respuesta = $this->getJson('/perfil');

        $respuesta->assertStatus(401);
    }

    public function testUsuarioAutenticadoVeSuPerfil(): void
    {
        $usuario = User::factory()->create(['name' => 'Juan']);

        $respuesta = $this->actingAs($usuario)->getJson('/perfil');

        $respuesta->assertOk()->assertJson(['nombre' => 'Juan']);
    }
}
