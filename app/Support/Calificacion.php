<?php

namespace App\Support;

use InvalidArgumentException;

class Calificacion
{
    /**
     * Convierte una nota de 0 a 100 en letra según la escala de la UTP.
     */
    public static function letra(int $nota): string
    {
        if ($nota < 0 || $nota > 100) {
            throw new InvalidArgumentException('La nota debe estar entre 0 y 100.');
        }

        return match (true) {
            $nota >= 91 => 'A',
            $nota >= 81 => 'B',
            $nota >= 71 => 'C',
            $nota >= 61 => 'D',
            default => 'F',
        };
    }
}
