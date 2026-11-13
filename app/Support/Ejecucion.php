<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\EstadoEjecucion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/**
 * Corre PHPUnit y sigue su avance. Único dueño de los estados de App\Enums\EstadoEjecucion.
 *
 * public/ejecucion/eventos.txt: cada evento de PHPUnit con su hora, mientras corre. Es estático a propósito:
 *   la página lo lee directo cada 100 ms, sin arrancar Laravel, y llama a estado() una sola vez al final.
 * Archivos en storage/app/ejecucion/:
 *   junit.xml    mensajes de las que fallaron
 *   salida.txt   lo que PHPUnit imprimió
 *   fin.txt      código de salida: existe solo al terminar
 *   guardada     ya está en el historial: se crea una sola vez
 * Historial: tablas ejecuciones y ejecucion_pruebas, las últimas 5.
 */
final class Ejecucion
{
    /** Sin cambios en los archivos por este tiempo, una ejecución sin fin.txt se da por perdida */
    private const SEGUNDOS_SIN_AVANCE = 120;

    private const HISTORIAL = 5;

    /** [hh:mm:ss.nnnnnnnnn / …] [n bytes] Evento: una línea de --log-events-verbose-text */
    private const RE_LINEA = '/^\[(\d+):(\d+):([\d.]+) \/ [^\]]+\] \[\d+ bytes\] (.+)$/';

    private const RE_TERMINADA = '/^Test (Passed|Failed|Errored) \((.+)::(\w+)/';

    private const RE_TOTAL = '/Test Suite Started \(.+phpunit\.xml, (\d+) tests?\)/';

    /**
     * Arranca PHPUnit en segundo plano. false si ya hay una corriendo: no se pisan.
     */
    public function iniciar(): bool
    {
        if ($this->estado()['estado'] === EstadoEjecucion::Corriendo) {
            return false;
        }

        $this->prepararCarpeta();
        Process::path(base_path())->run(['sh', '-c', 'nohup sh -c '.escapeshellarg($this->comando()).' > /dev/null 2>&1 &']);

        return true;
    }

    /**
     * Sin JS: corre PHPUnit, espera y guarda. null si ya hay una corriendo.
     */
    public function correrYEsperar(): ?array
    {
        if ($this->estado()['estado'] === EstadoEjecucion::Corriendo) {
            return null;
        }

        $this->prepararCarpeta();
        Process::path(base_path())->timeout(self::SEGUNDOS_SIN_AVANCE)->run(['sh', '-c', $this->comando()]);

        return $this->guardar();
    }

    /**
     * Cómo va: estado, pruebas terminadas con su segundo, total y duración. Lee lo que PHPUnit lleva escrito.
     *
     * @return array{estado: EstadoEjecucion, eventos: list<array{t: float, ms: int, clase: string, metodo: string, paso: bool}>, total: int, duracion: float, salida: ?string}
     */
    public function estado(): array
    {
        if (! File::isDirectory($this->carpeta())) {
            return ['estado' => EstadoEjecucion::Ninguna, 'eventos' => [], 'total' => 0, 'duracion' => 0.0, 'salida' => null];
        }

        ['eventos' => $eventos, 'total' => $total, 'duracion' => $duracion] = $this->leerEventos();

        if (File::exists($this->carpeta('fin.txt'))) {
            $estado = EstadoEjecucion::alTerminar((int) trim(File::get($this->carpeta('fin.txt'))), count($eventos));
        } elseif ($this->ultimoCambio() < time() - self::SEGUNDOS_SIN_AVANCE) {
            $estado = EstadoEjecucion::Error;
        } else {
            $estado = EstadoEjecucion::Corriendo;
        }

        $salida = match (true) {
            $estado !== EstadoEjecucion::Error => null,
            ! File::exists($this->carpeta('fin.txt')) => 'PHPUnit se detuvo sin terminar.',
            default => File::get($this->carpeta('salida.txt')),
        };

        return ['estado' => $estado, 'eventos' => $eventos, 'total' => $total, 'duracion' => $duracion, 'salida' => $salida];
    }

    /**
     * La pasa al historial una sola vez, aunque lleguen dos consultas juntas. null si no terminó o ya estaba guardada.
     */
    public function guardar(?array $estado = null): ?array
    {
        $estado ??= $this->estado();
        if (! $estado['estado']->terminada()) {
            return null;
        }
        // 'x': crear solo si no existe. Atómico: la segunda consulta no la guarda otra vez
        $marca = @fopen($this->carpeta('guardada'), 'x');
        if ($marca === false) {
            return null;
        }
        fclose($marca);

        $mensajes = $this->mensajesDeFallas();
        $aprobadas = count(array_filter($estado['eventos'], fn ($e) => $e['paso']));
        $ejecucion = [
            'estado' => $estado['estado']->value,
            'total' => $estado['total'],
            'aprobadas' => $aprobadas,
            'fallidas' => count($estado['eventos']) - $aprobadas,
            'duracion' => $estado['duracion'],
            'salida' => $estado['salida'],
        ];

        DB::transaction(function () use ($ejecucion, $estado, $mensajes) {
            $id = DB::table('ejecuciones')->insertGetId($ejecucion);
            DB::table('ejecucion_pruebas')->insert(array_map(fn ($e) => [
                'ejecucion_id' => $id,
                'clase' => $e['clase'],
                'metodo' => $e['metodo'],
                'paso' => $e['paso'],
                't' => $e['t'],
                'ms' => $e['ms'],
                'mensaje' => $e['paso'] ? null : ($mensajes[$e['clase'].'::'.$e['metodo']] ?? null),
            ], $estado['eventos']));
            // Solo las últimas: las pruebas de las viejas se borran en cascada
            $limite = DB::table('ejecuciones')->orderByDesc('id')->skip(self::HISTORIAL - 1)->limit(1)->value('id');
            if ($limite !== null) {
                DB::table('ejecuciones')->where('id', '<', $limite)->delete();
            }
        });

        return $ejecucion;
    }

    /**
     * La última con cada prueba: lo que pinta la página de Pruebas.
     *
     * @return array{estado: string, fecha: string, total: int, duracion: float, salida: ?string, eventos: list<array{t: float, ms: int, clase: string, metodo: string, paso: bool, mensaje: ?string}>}|null
     */
    public function ultima(): ?array
    {
        $fila = DB::table('ejecuciones')->orderByDesc('id')->first(['id', 'estado', 'created_at', 'total', 'duracion', 'salida']);
        if ($fila === null) {
            return null;
        }

        return [
            'estado' => $fila->estado,
            'fecha' => $fila->created_at,
            'total' => (int) $fila->total,
            'duracion' => (float) $fila->duracion,
            'salida' => $fila->salida,
            'eventos' => DB::table('ejecucion_pruebas')
                ->where('ejecucion_id', $fila->id)
                ->orderBy('id')
                ->get(['t', 'ms', 'clase', 'metodo', 'paso', 'mensaje'])
                ->map(fn ($e) => ['t' => (float) $e->t, 'ms' => (int) $e->ms, 'clase' => $e->clase, 'metodo' => $e->metodo, 'paso' => (bool) $e->paso, 'mensaje' => $e->mensaje])
                ->all(),
        ];
    }

    /** Texto del aviso al terminar. */
    public static function aviso(array $ejecucion): string
    {
        $terminadas = $ejecucion['aprobadas'] + $ejecucion['fallidas'];

        return match (EstadoEjecucion::from($ejecucion['estado'])) {
            EstadoEjecucion::Aprobada => "{$ejecucion['aprobadas']} de {$terminadas} pruebas aprobadas.",
            EstadoEjecucion::Fallida => "Fallaron {$ejecucion['fallidas']} de {$terminadas} pruebas.",
            default => 'No se pudieron ejecutar las pruebas.',
        };
    }

    private function carpeta(string $archivo = ''): string
    {
        return storage_path('app/ejecucion'.($archivo ? "/{$archivo}" : ''));
    }

    /** El registro que la página lee directo: public/ejecucion/eventos.txt */
    public static function rutaEventos(): string
    {
        return public_path('ejecucion/eventos.txt');
    }

    private function prepararCarpeta(): void
    {
        File::deleteDirectory($this->carpeta());
        File::makeDirectory($this->carpeta(), recursive: true);
        File::ensureDirectoryExists(dirname(self::rutaEventos()));
        File::put(self::rutaEventos(), '');
    }

    private function ultimoCambio(): int
    {
        return max(array_map(fn ($ruta) => (int) @filemtime((string) $ruta), [$this->carpeta(), self::rutaEventos(), ...File::files($this->carpeta())]));
    }

    /**
     * Entorno limpio: así manda phpunit.xml (base pruebas_app_test) y no el .env del servidor.
     */
    private function comando(): string
    {
        return sprintf(
            'cd %s && env -i PATH=%s HOME=%s %s vendor/bin/phpunit --log-events-verbose-text %s --log-junit %s > %s 2>&1; echo $? > %s',
            escapeshellarg(base_path()),
            escapeshellarg((string) getenv('PATH')),
            escapeshellarg((string) getenv('HOME')),
            escapeshellarg(PHP_BINARY),
            escapeshellarg(self::rutaEventos()),
            escapeshellarg($this->carpeta('junit.xml')),
            escapeshellarg($this->carpeta('salida.txt')),
            escapeshellarg($this->carpeta('fin.txt')),
        );
    }

    /**
     * @return array{eventos: list<array{t: float, ms: int, clase: string, metodo: string, paso: bool}>, total: int, duracion: float}
     */
    private function leerEventos(): array
    {
        $texto = File::exists(self::rutaEventos()) ? File::get(self::rutaEventos()) : '';
        $eventos = [];
        $preparada = null;
        $duracion = 0.0;

        foreach (explode("\n", $texto) as $linea) {
            if (! preg_match(self::RE_LINEA, $linea, $m)) {
                continue;
            }
            $t = $m[1] * 3600 + $m[2] * 60 + (float) $m[3];
            $duracion = $t;
            if (str_starts_with($m[4], 'Test Prepared (')) {
                $preparada = $t;
            } elseif (preg_match(self::RE_TERMINADA, $m[4], $e)) {
                $eventos[] = [
                    't' => round($t, 3),
                    'ms' => (int) round(($t - ($preparada ?? $t)) * 1000),
                    'clase' => class_basename($e[2]),
                    'metodo' => $e[3],
                    'paso' => $e[1] === 'Passed',
                ];
            }
        }
        preg_match(self::RE_TOTAL, $texto, $total);

        return ['eventos' => $eventos, 'total' => (int) ($total[1] ?? 0), 'duracion' => round($duracion, 3)];
    }

    /** @return array<string, string> clase::método => mensaje */
    private function mensajesDeFallas(): array
    {
        if (! File::exists($this->carpeta('junit.xml'))) {
            return [];
        }

        $mensajes = [];
        foreach (simplexml_load_file($this->carpeta('junit.xml'))->xpath('//testcase') as $caso) {
            $mensajes[class_basename((string) $caso['class']).'::'.$caso['name']] = trim((string) ($caso->failure ?? $caso->error));
        }

        return $mensajes;
    }
}
