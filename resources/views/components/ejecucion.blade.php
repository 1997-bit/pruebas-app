@props(['estado', 'pruebas'])
@php
    use App\Enums\EstadoEjecucion;
    use App\Enums\EstadoPrueba;

    // Guardadas traen el estado como texto; la que corre, como enum
    $fase = $estado['estado'] instanceof EstadoEjecucion ? $estado['estado'] : EstadoEjecucion::from($estado['estado']);
    // Una ejecución, en vivo o guardada: encabezado, pruebas terminadas por intervalo y un segmento por prueba
    $eventos = collect($estado['eventos']);
    $porPrueba = $eventos->keyBy(fn ($e) => $e['clase'].'::'.$e['metodo']);
    $aprobadas = $eventos->where('paso', true)->count();
    $fallaron = $eventos->where('paso', false)->count();
    $total = max($estado['total'], collect($pruebas)->sum(fn ($p) => count($p['metodos'])));
    $corriendo = $fase === EstadoEjecucion::Corriendo;
    $segundos = fn ($s) => number_format($s, 2, '.', ',').' s';

    // Pruebas corridas hasta cada momento, cada 50 ms desde el inicio
    $paso = 0.05;
    $intervalos = (int) ceil(max($estado['duracion'], $paso) / $paso);
    $puntos = collect(range(0, $intervalos))->map(fn ($i) => [
        'hasta' => $i * $paso,
        'corridas' => $eventos->filter(fn ($e) => $e['t'] <= $i * $paso)->count(),
        // Una falla en este tramo: raya roja en el gráfico
        'falla' => $eventos->contains(fn ($e) => ! $e['paso'] && $e['t'] > ($i - 1) * $paso && $e['t'] <= $i * $paso),
    ]);
@endphp
<section class="tarjeta tabular" id="ejecucion" aria-labelledby="t-ejecucion" data-total="{{ $total }}" data-estado="{{ $fase->value }}"
         data-barras='@json(collect(EstadoPrueba::cases())->mapWithKeys(fn ($e) => [$e->value => $e->barra()]))' @if ($corriendo) aria-busy="true" @endif>
  <header class="tarjeta-encabezado">
    <h2 class="tarjeta-titulo" id="t-ejecucion">{{ $fase->titulo() }}</h2>
    <div class="acciones">
      <div class="cifra">
        <p class="cifra-valor tabular" data-duracion>{{ $segundos($estado['duracion']) }}</p>
        <p class="cifra-nota fila">
          <span class="tabular" data-aprobadas>{{ $aprobadas }} aprobadas</span>
          {{-- Las dos insignias están siempre: solo cambian texto y color, la tarjeta no crece ni baja --}}
          <span class="insignia {{ $fallaron ? 'insignia-peligro' : ($corriendo || $eventos->isEmpty() ? 'insignia-secundaria' : 'insignia-exito') }}" data-fallaron>{{ $fallaron ? $fallaron.' '.($fallaron === 1 ? 'falló' : 'fallaron') : 'Sin fallos' }}</span>
          <span class="insignia insignia-secundaria" data-cola>{{ $corriendo ? ($total - $eventos->count()).' en cola' : $total.' pruebas' }}</span>
        </p>
      </div>
    </div>
  </header>

  <div class="pila">
    <figure class="grafico" data-tipo="linea" data-area data-curva="suave" data-alto="10rem" data-sin-datos>
      <figcaption><strong>Pruebas terminadas</strong></figcaption>
      <table>
        <thead><tr><th scope="col">Segundo</th><th scope="col" data-color="texto">Terminadas</th></tr></thead>
        <tbody>
          @foreach ($puntos as $p)
            <tr @if ($p['falla']) data-marca="peligro" @endif><th scope="row">{{ number_format($p['hasta'], 2, '.', '') }}</th><td data-valor="{{ $p['corridas'] }}">{{ $p['corridas'] }}</td></tr>
          @endforeach
        </tbody>
      </table>
    </figure>

    <hr class="separador">
    <h3 class="titulo-seccion">Por archivo</h3>
    <div class="tabla-contenedor">
      <table class="tabla">
        <caption class="solo-lector">Pruebas por archivo</caption>
        <thead><tr><th scope="col">Archivo</th><th scope="col">Pruebas</th><th scope="col" class="num">Resultado</th></tr></thead>
        <tbody>
          @foreach ($pruebas as $prueba)
            @php
              $suyas = collect($prueba['metodos'])->map(fn ($m) => $porPrueba->get($prueba['clase'].'::'.$m));
              $hechas = $suyas->filter();
              $mal = $hechas->where('paso', false)->count();
            @endphp
            <tr data-archivo="{{ $prueba['clase'] }}">
              <th scope="row"><span class="codigo">{{ $prueba['ruta'] }}</span></th>
              <td>
                <div class="barra-apilada" role="img" aria-label="{{ $hechas->count() }} de {{ $suyas->count() }} terminadas, {{ $mal }} con fallos">
                  @foreach ($suyas as $k => $e)<span class="{{ EstadoPrueba::de($e)->barra() }}" data-prueba="{{ $prueba['clase'] }}::{{ $prueba['metodos'][$k] }}"></span>@endforeach
                </div>
                <div data-fallas>
                  {{-- Solo el nombre, con enlace a su fila: el mensaje está en la tabla de abajo --}}
                  @foreach ($hechas->where('paso', false) as $e)<p class="campo-error" data-metodo="{{ $e['metodo'] }}">@icono('circle-x')<a href="#prueba-{{ $e['clase'] }}-{{ $e['metodo'] }}">{{ $e['metodo'] }}</a></p>@endforeach
                </div>
              </td>
              <td class="num" data-resultado>
                @if ($mal)<span class="insignia insignia-peligro">{{ $mal }} {{ $mal === 1 ? 'falló' : 'fallaron' }}</span>
                @elseif ($hechas->count() < $suyas->count())<span class="insignia insignia-secundaria">{{ $hechas->count() }} de {{ $suyas->count() }}</span>
                @else<span class="insignia insignia-borde">{{ $hechas->sum('ms') }} ms</span>@endif
              </td>
            </tr>
          @endforeach
        </tbody>
      </table>
    </div>
    @if ($estado['salida'])<pre class="log-detalle">{{ Str::limit($estado['salida'], 1500) }}</pre>@endif
  </div>
  <template id="icono-fallo">@icono('circle-x')</template>
</section>
