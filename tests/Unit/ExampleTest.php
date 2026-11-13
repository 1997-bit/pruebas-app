<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\CoversNothing;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Small;
use PHPUnit\Framework\TestCase;

// Enunciado, paso 1: la prueba de ejemplo que trae Laravel
#[CoversNothing]
#[Small]
#[Group('unitaria')]
final class ExampleTest extends TestCase
{
    public function testVerdaderoEsVerdadero(): void
    {
        $this->assertTrue(true);
    }
}
