@php
    // La tarjeta pinta la que corre; si no hay, la última guardada. La tabla, la última guardada
    $total = collect($pruebas)->sum(fn ($p) => count($p['metodos']));
    $tarjeta = match (true) {
        $actual['estado'] === \App\Enums\EstadoEjecucion::Corriendo => $actual,
        $ultima !== null => $ultima,
        default => ['estado' => \App\Enums\EstadoEjecucion::Ninguna, 'eventos' => [], 'total' => $total, 'duracion' => 0, 'salida' => null],
    };
    $casos = collect($ultima['eventos'] ?? [])->keyBy(fn ($c) => $c['clase'].'::'.$c['metodo']);

    // Filtros por GET: sin JS también filtra. Una fila por método que cumple los tres
    $q = mb_strtolower(trim((string) request()->query('q', '')));
    $suite = request()->query('suite', '');
    $estadoFiltro = \App\Enums\EstadoPrueba::tryFrom((string) request()->query('estado', ''));
    $filas = collect($pruebas)->flatMap(fn ($p) => collect($p['metodos'])->map(fn ($m) => ['prueba' => $p, 'metodo' => $m, 'caso' => $casos->get($p['clase'].'::'.$m)]))
        ->filter(fn ($f) => ($q === '' || str_contains(mb_strtolower($f['metodo'].' '.$f['prueba']['clase']), $q))
            && ($suite === '' || $f['prueba']['tipo'] === $suite)
            && ($estadoFiltro === null || \App\Enums\EstadoPrueba::de($f['caso']) === $estadoFiltro));
    $filtrando = $q !== '' || $suite !== '' || $estadoFiltro !== null;
@endphp
<x-layouts.app titulo="Pruebas">
  <header class="encabezado">
    <div>
      <h1>Pruebas</h1>
    </div>
    <div class="acciones">
      <form method="post" action="{{ route('pruebas.ejecutar') }}" data-esqueleto="tabla" data-en-vivo
            data-iniciar="{{ route('pruebas.iniciar') }}" data-estado="{{ route('pruebas.estado') }}" data-eventos="{{ asset('ejecucion/eventos.txt') }}">
        @csrf
        <button class="btn btn-primario" type="submit" data-atajo="e" data-atajo-texto="Ejecutar pruebas">@icono('terminal')
          Ejecutar pruebas</button>
      </form>
    </div>
  </header>

  <div class="pila">
    <x-ejecucion :estado="$tarjeta" :pruebas="$pruebas" />

    <search aria-label="Filtrar pruebas"><form class="filtros" method="get" action="{{ route('pruebas') }}" data-esqueleto="tabla">
      <div class="campo campo-busqueda">
        <label for="q">Buscar</label>
        <input class="control" id="q" name="q" type="search" enterkeyhint="search" value="{{ request()->query('q') }}" placeholder="Método o clase">
      </div>
      <div class="campo">
        <label for="fl-suite">Suite</label>
        <div class="select"><select class="control" id="fl-suite" name="suite">
          <option value="">Todas</option>
          @foreach (['Unit', 'Feature'] as $s)<option @selected($suite === $s)>{{ $s }}</option>@endforeach
        </select></div>
      </div>
      <div class="campo">
        <label for="fl-estado">Estado</label>
        <div class="select"><select class="control" id="fl-estado" name="estado">
          <option value="">Todos</option>
          @foreach (\App\Enums\EstadoPrueba::cases() as $e)<option value="{{ $e->value }}" @selected($estadoFiltro === $e)>{{ $e->texto() }}</option>@endforeach
        </select></div>
      </div>
      <div class="acciones">
        <button class="btn btn-secundario" type="submit">Filtrar</button>
        @if ($filtrando)<a class="btn btn-fantasma" href="{{ route('pruebas') }}">Limpiar</a>@endif
      </div>
    </form></search>

    <div class="pila" data-detalle>
    <div class="tabla-contenedor">
      <table class="tabla tabla-tarjetas tabular">
        <caption class="solo-lector">Pruebas del proyecto{{ $filtrando ? ', '.$filas->count().' de '.$total : '' }}</caption>
        <thead><tr><th scope="col">Prueba</th><th scope="col">Clase</th><th scope="col">Suite</th><th scope="col">Grupos</th><th scope="col">Estado</th><th scope="col" class="num">Duración (ms)</th></tr></thead>
        <tbody>
          @forelse ($filas as ['prueba' => $prueba, 'metodo' => $metodo, 'caso' => $caso])
              {{-- id: destino de los enlaces de "Por archivo" --}}
              <tr id="prueba-{{ $prueba['clase'] }}-{{ $metodo }}">
                <td data-columna="Prueba" class="celda-larga"><span class="codigo">{{ $metodo }}</span>
                  @if ($caso && ! $caso['paso'])<p class="campo-error">@icono('circle-alert'){{ Str::limit($caso['mensaje'] ?? '', 200) }}</p>@endif
                </td>
                <td data-columna="Clase">{{ $prueba['clase'] }}</td>
                <td data-columna="Suite"><span class="insignia {{ $prueba['tipo'] === 'Unit' ? 'insignia-info' : 'insignia-destacado' }}">{{ $prueba['tipo'] }}</span></td>
                {{-- Nombre completo y no la sigla: se entiende sin globo --}}
                <td data-columna="Grupos"><span class="fila">
                  @foreach ($prueba['grupos'][$metodo] ?? [] as $grupo)
                    <span class="insignia insignia-borde">{{ config("pruebas.tipos.$grupo.texto", $grupo) }}</span>
                  @endforeach
                </span></td>
                @php $estadoPrueba = \App\Enums\EstadoPrueba::de($caso); @endphp
                <td data-columna="Estado"><span class="insignia {{ $estadoPrueba->insignia() }}">{{ $estadoPrueba->texto() }}</span></td>
                <td data-columna="Duración (ms)" class="num">{{ $caso['ms'] ?? '' }}</td>
              </tr>
          @empty
              <tr><td colspan="6">Ninguna prueba cumple los filtros. <a href="{{ route('pruebas') }}">Ver todas</a></td></tr>
          @endforelse
        </tbody>
      </table>
    </div>
    </div>
  </div>
  <script type="module" src="{{ asset('js/ejecucion.js') }}"></script>
</x-layouts.app>
