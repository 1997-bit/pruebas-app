<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\File;

/**
 * SVG de Lucide en línea, con class="icono". Se usa con @icono('trash-2') o @icono('sun', 'tema-sol').
 *
 * Los SVG son fijos: `php artisan iconos` los limpia una vez y los deja en resources/iconos.php,
 * un arreglo nombre → SVG. Al pintar solo se busca el nombre y se pone la clase: sin leer archivos,
 * sin regex y sin un componente Blade por ícono.
 */
final class Icono
{
    /** Comentario de licencia al inicio del archivo */
    private const RE_COMENTARIO = '/<!--.*?-->\s*/s';

    /** class="lucide lucide-…" del archivo */
    private const RE_CLASE = '/class="[^"]*"/';

    /** Donde va la clase extra: se reemplaza al pintar */
    private const MARCA = '{{clase}}';

    /** @var array<string, string>|null nombre => SVG limpio, de resources/iconos.php */
    private static ?array $tabla = null;

    public static function svg(string $nombre, ?string $clase = null): string
    {
        self::$tabla ??= require self::rutaTabla();

        return str_replace(self::MARCA, $clase ? ' '.e($clase) : '', self::$tabla[$nombre]
            ?? throw new \InvalidArgumentException("No existe el ícono {$nombre}. ¿Corriste php artisan iconos?"));
    }

    /**
     * Limpia cada SVG de la librería y escribe la tabla. Devuelve cuántos íconos quedaron.
     */
    public static function generar(): int
    {
        $tabla = [];
        foreach (File::files(public_path('assets/diseno/iconos')) as $archivo) {
            if ($archivo->getExtension() !== 'svg') {
                continue;
            }
            $tabla[$archivo->getFilenameWithoutExtension()] = preg_replace(
                [self::RE_COMENTARIO, self::RE_CLASE],
                ['', 'class="icono'.self::MARCA.'" aria-hidden="true" focusable="false"'],
                $archivo->getContents(),
                limit: 1,
            );
        }
        ksort($tabla);
        File::put(self::rutaTabla(), "<?php\n\n// Generado por `php artisan iconos` desde public/assets/diseno/iconos. No editar a mano\nreturn ".var_export($tabla, true).";\n");

        return count($tabla);
    }

    private static function rutaTabla(): string
    {
        return resource_path('iconos.php');
    }
}
