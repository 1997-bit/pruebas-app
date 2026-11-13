<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Medium;
use Tests\TestCase;

// Enunciado, paso 3: RefreshDatabase
#[CoversClass(User::class)]
#[Medium]
#[Group('integracion')]
final class UsuarioTest extends TestCase
{
    use RefreshDatabase;

    public function testCrearUsuarioLoGuardaEnLaBase(): void
    {
        User::factory()->create(['email' => 'juan@example.com']);

        $this->assertDatabaseHas('users', ['email' => 'juan@example.com']);
        $this->assertDatabaseCount('users', 1);
    }
}
