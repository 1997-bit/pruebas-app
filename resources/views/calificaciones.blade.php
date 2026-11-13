<x-layouts.app titulo="Calificaciones">
  <header class="encabezado">
    <div>
      <h1>Calificaciones</h1>
    </div>
  </header>

  <div class="rejilla-panel">
    <form class="tarjeta" method="get" action="{{ route('calificaciones') }}" aria-labelledby="t-convertir">
      <header class="tarjeta-encabezado">
        <h2 class="tarjeta-titulo" id="t-convertir">Convertir nota</h2>
      </header>
      <div class="tarjeta-contenido pila">
        <div class="campo">
          <label for="nota">Nota <span class="requerido" aria-hidden="true">*</span></label>
          <input class="control" id="nota" name="nota" type="number" inputmode="numeric" min="0" max="100" required value="{{ old('nota', $nota) }}"
                 @error('nota') aria-invalid="true" aria-describedby="nota-error" @enderror>
          @error('nota')
            <p class="campo-error" id="nota-error">@icono('circle-alert'){{ $message }}</p>
          @enderror
        </div>
        @if ($letra)
          <div class="tarjeta cifra cifra-principal">
            <p class="cifra-etiqueta">Una nota de {{ $nota }} es</p>
            <p class="cifra-valor">{{ $letra }}</p>
          </div>
        @endif
      </div>
      <footer class="tarjeta-pie">
        <button class="btn btn-primario" type="submit">Convertir</button>
      </footer>
    </form>

    <section class="tarjeta" aria-labelledby="t-escala">
      <header class="tarjeta-encabezado">
        <h2 class="tarjeta-titulo" id="t-escala">Escala</h2>
      </header>
      <div class="tabla-contenedor">
        <table class="tabla">
          <caption class="solo-lector">Escala de calificaciones</caption>
          <thead><tr><th scope="col">Letra</th><th scope="col" class="num">Desde</th><th scope="col" class="num">Hasta</th><th scope="col"><span class="solo-lector">Tu nota</span></th></tr></thead>
          <tbody>
            @foreach ([['A', 91, 100], ['B', 81, 90], ['C', 71, 80], ['D', 61, 70], ['F', 0, 60]] as [$l, $desde, $hasta])
              <tr>
                <th scope="row">{{ $l }}</th>
                <td class="num">{{ $desde }}</td>
                <td class="num">{{ $hasta }}</td>
                <td>@if ($letra === $l)<span class="insignia insignia-destacado">Tu nota</span>@endif</td>
              </tr>
            @endforeach
          </tbody>
        </table>
      </div>
    </section>
  </div>
</x-layouts.app>
