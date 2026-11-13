<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Una prueba dentro de una ejecución: Pendiente ──▶ Aprobada | Fallo. No vuelve atrás.
 */
enum EstadoPrueba: string
{
    case Pendiente = 'pendiente';
    case Aprobada = 'aprobada';
    case Fallo = 'fallo';

    /** @param  array{paso: bool}|null  $evento  el evento de PHPUnit, o null si todavía no terminó */
    public static function de(?array $evento): self
    {
        return match (true) {
            $evento === null => self::Pendiente,
            $evento['paso'] => self::Aprobada,
            default => self::Fallo,
        };
    }

    public function texto(): string
    {
        return match ($this) {
            self::Pendiente => 'Sin ejecutar',
            self::Aprobada => 'Aprobada',
            self::Fallo => 'Falló',
        };
    }

    /** Variante de .insignia */
    public function insignia(): string
    {
        return match ($this) {
            self::Pendiente => 'insignia-secundaria',
            self::Aprobada => 'insignia-exito',
            self::Fallo => 'insignia-peligro',
        };
    }

    /** Segmento de .barra-apilada */
    public function barra(): string
    {
        return match ($this) {
            self::Pendiente => 'barra-secundaria',
            self::Aprobada => 'barra-exito',
            self::Fallo => 'barra-peligro',
        };
    }
}
