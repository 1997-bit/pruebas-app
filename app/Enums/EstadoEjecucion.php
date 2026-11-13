<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Ciclo de vida de una ejecución de PHPUnit. Lo maneja App\Support\Ejecucion.
 *
 *   Ninguna ──iniciar()──▶ Corriendo ──fin.txt = 0──────────▶ Aprobada
 *                             │        ──fin.txt ≠ 0, con pruebas──▶ Fallida
 *                             │        ──fin.txt ≠ 0, sin pruebas──▶ Error
 *                             └──────── sin cambios en 2 min ──────▶ Error
 *   Aprobada | Fallida | Error ──iniciar()──▶ Corriendo
 *
 * Qué se puede hacer en cada estado (operaciones de App\Support\Ejecucion y de public/js/ejecucion.js):
 *
 *   Estado                    Se puede                                        Se rechaza
 *   ────────────────────────  ──────────────────────────────────────────────  ───────────────────────────────────────────
 *   Ninguna                   iniciar(), correrYEsperar()                     guardar() → null: no hay nada terminado
 *   Corriendo                 observar: leer public/ejecucion/eventos.txt     iniciar() → false: la ruta responde 409 y
 *                             estado(); unirse: otra pestaña recibe 409       la página se une a la que corre
 *                             y sigue la misma ejecución                      correrYEsperar() → null: aviso "Ya hay una
 *                                                                             ejecución en curso"; guardar() → null
 *   Aprobada|Fallida|Error    guardar() una sola vez (marca atómica);         guardar() otra vez → null: ya está en el
 *                             iniciar(), correrYEsperar()                     historial
 *
 * Las guardias son en tiempo de ejecución a propósito: el estado vive en archivos, en la base y en otras
 * pestañas, no en un objeto PHP. Un tipo solo lo vería en el instante en que se cargó.
 */
enum EstadoEjecucion: string
{
    case Ninguna = 'ninguna';
    case Corriendo = 'corriendo';
    case Aprobada = 'aprobada';
    case Fallida = 'fallida';
    case Error = 'error';

    public function terminada(): bool
    {
        return in_array($this, [self::Aprobada, self::Fallida, self::Error], true);
    }

    public function titulo(): string
    {
        return match ($this) {
            self::Ninguna => 'Todavía no se han ejecutado',
            self::Corriendo => 'Ejecutando pruebas',
            self::Aprobada => 'Todas aprobadas',
            self::Fallida => 'Pruebas con fallos',
            self::Error => 'No se pudieron ejecutar',
        };
    }

    /** Tono del aviso: alerta-exito o alerta-error. */
    public function tono(): string
    {
        return $this === self::Aprobada ? 'exito' : 'error';
    }

    /** El estado final según el código de salida de PHPUnit y cuántas pruebas terminaron. */
    public static function alTerminar(int $codigo, int $terminadas): self
    {
        return match (true) {
            $codigo === 0 => self::Aprobada,
            $terminadas === 0 => self::Error,
            default => self::Fallida,
        };
    }
}
