<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\Calificacion;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Small;
use PHPUnit\Framework\TestCase;

// Enunciado, paso 2: prueba Unit de lógica propia
#[CoversClass(Calificacion::class)]
#[Small]
#[Group('unitaria')]
final class CalificacionTest extends TestCase
{
    public function testConvierteLaNotaEnLetra(): void
    {
        $this->assertSame('A', Calificacion::letra(95));
        $this->assertSame('B', Calificacion::letra(85));
        $this->assertSame('C', Calificacion::letra(75));
        $this->assertSame('D', Calificacion::letra(65));
        $this->assertSame('F', Calificacion::letra(40));
    }

    public function testRespetaLosLimitesDeCadaLetra(): void
    {
        $this->assertSame('A', Calificacion::letra(91));
        $this->assertSame('B', Calificacion::letra(90));
        $this->assertSame('F', Calificacion::letra(60));
    }

    public function testNotaFueraDeRangoDaError(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Calificacion::letra(101);
    }
}
