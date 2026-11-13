<?php

namespace App\Http\Controllers;

use App\Enums\EstadoEjecucion;
use App\Models\User;
use App\Support\Calificacion;
use App\Support\Ejecucion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class LaboratorioController extends Controller
{
    /** #[Group('unitaria')]: el tipo de prueba, config/pruebas.php */
    private const RE_GRUPO = "/#\\[Group\\('(\\w+)'\\)\\]/";

    /** Los atributos de un método de prueba y su nombre */
    private const RE_METODO = '/((?:\\s*#\\[[^\\]]*\\])*)\\s*public function (test\\w+)/';

    private const RE_TAMANO = '/#\\[(Small|Medium|Large)\\]/';

    private const RE_EXTENDS = '/extends (\w+)/';

    /** use Tests\TestCase; → nombre corto y completo */
    private const RE_USE = '/^use ([\w\\\\]+\\\\(\w+));/m';

    public function calificaciones(Request $request)
    {
        $datos = $request->validate(
            ['nota' => ['nullable', 'integer', 'between:0,100']],
            ['nota.integer' => 'La nota debe ser un número entero.', 'nota.between' => 'La nota debe estar entre 0 y 100.'],
        );
        $nota = $datos['nota'] ?? null;

        return view('calificaciones', [
            'nota' => $nota,
            'letra' => $nota === null ? null : Calificacion::letra((int) $nota),
        ]);
    }

    public function usuarios()
    {
        return view('usuarios', ['usuarios' => User::latest()->paginate(10, ['id', 'name', 'email', 'created_at'])]);
    }

    public function crearUsuario(Request $request)
    {
        $datos = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        ], [
            'name.required' => 'Escriba el nombre.',
            'email.required' => 'Escriba el correo.',
            'email.email' => 'Escriba un correo válido, como ana@ejemplo.com.',
            'email.unique' => 'Ya hay un usuario con ese correo.',
        ]);

        User::create($datos + ['password' => 'password']);

        return redirect()->route('usuarios')->with('aviso', "Se creó a {$datos['name']}.");
    }

    public function crearUsuariosDePrueba()
    {
        User::factory()->count(5)->create();

        return redirect()->route('usuarios')->with('aviso', 'Se crearon 5 usuarios con la factory.');
    }

    public function borrarUsuario(int $usuario)
    {
        $nombre = User::whereKey($usuario)->value('name') ?? abort(404);
        User::whereKey($usuario)->delete();

        return redirect()->route('usuarios')->with('aviso', "Se borró a {$nombre}.");
    }

    public function pruebas(Ejecucion $ejecucion)
    {
        return view('pruebas', [
            'pruebas' => $this->leerPruebas(),
            'actual' => $ejecucion->estado(),
            'ultima' => $ejecucion->ultima(),
        ]);
    }

    /**
     * Sin JS: corre PHPUnit y espera. Si ya hay una corriendo, no la pisa.
     */
    public function ejecutarPruebas(Ejecucion $ejecucion)
    {
        $guardada = $ejecucion->correrYEsperar();

        if ($guardada === null) {
            return redirect()->route('pruebas')
                ->with('aviso', 'Ya hay una ejecución en curso.')
                ->with('aviso_tono', 'error');
        }

        return redirect()->route('pruebas')
            ->with('aviso', Ejecucion::aviso($guardada))
            ->with('aviso_tono', EstadoEjecucion::from($guardada['estado'])->tono());
    }

    /**
     * Con JS: arranca PHPUnit en segundo plano. 409 si ya hay una corriendo: la página se une a esa.
     */
    public function iniciarPruebas(Ejecucion $ejecucion)
    {
        $iniciada = $ejecucion->iniciar();

        return response()->json(['estado' => EstadoEjecucion::Corriendo->value], $iniciada ? 202 : 409);
    }

    /**
     * Cómo va, en JSON. La página la llama al ver el fin en public/ejecucion/eventos.txt, o si deja de avanzar.
     * Al terminar la guarda una sola vez y deja el aviso para la próxima página.
     */
    public function estadoPruebas(Ejecucion $ejecucion)
    {
        $estado = $ejecucion->estado();

        if ($guardada = $ejecucion->guardar($estado)) {
            session()->flash('aviso', Ejecucion::aviso($guardada));
            session()->flash('aviso_tono', $estado['estado']->tono());
        }

        return response()->json([
            ...collect($estado)->except('salida')->all(),
            'estado' => $estado['estado']->value,
            'titulo' => $estado['estado']->titulo(),
        ]);
    }

    /**
     * Las pruebas de tests/, leídas de los archivos: clase, tipo, clase base y métodos.
     */
    private function leerPruebas(): array
    {
        return collect(File::allFiles(base_path('tests')))
            ->filter(fn ($archivo) => str_ends_with($archivo->getFilename(), 'Test.php'))
            ->map(function ($archivo) {
                $codigo = $archivo->getContents();
                // Grupos de la clase y de cada método: #[Group('unitaria')]
                $cabecera = strstr($codigo, 'final class', true) ?: strstr($codigo, 'class ', true);
                preg_match_all(self::RE_GRUPO, $cabecera, $deClase);
                preg_match_all(self::RE_METODO, $codigo, $metodos, PREG_SET_ORDER);
                preg_match(self::RE_TAMANO, $cabecera, $tamano);
                preg_match(self::RE_EXTENDS, $codigo, $base);
                preg_match_all(self::RE_USE, $codigo, $usos);
                $usados = array_combine($usos[2], $usos[1]);

                return [
                    'clase' => $archivo->getFilenameWithoutExtension(),
                    'ruta' => 'tests/'.$archivo->getRelativePathname(),
                    'tipo' => $archivo->getRelativePath(),
                    'base' => $usados[$base[1] ?? ''] ?? $base[1] ?? '',
                    'metodos' => array_column($metodos, 2),
                    'tamano' => $tamano[1] ?? null,
                    'grupos' => collect($metodos)->mapWithKeys(function ($m) use ($deClase) {
                        preg_match_all(self::RE_GRUPO, $m[1], $propios);

                        return [$m[2] => array_values(array_unique([...$deClase[1], ...$propios[1]]))];
                    })->all(),
                    'codigo' => $codigo,
                ];
            })
            ->sortBy(['tipo', 'clase'])
            ->values()
            ->all();
    }
}
