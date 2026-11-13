<x-layouts.app titulo="Usuarios">
  <header class="encabezado">
    <div>
      <h1>Usuarios</h1>
    </div>
    <div class="acciones">
      <form method="post" action="{{ route('usuarios.prueba') }}" data-esqueleto="tabla">
        @csrf
        <button class="btn btn-secundario" type="submit" data-atajo="f" data-atajo-texto="Crear 5 con la factory">@icono('plus')
          Crear 5 con la factory</button>
      </form>
    </div>
  </header>

  <div class="pila">
    <form class="tarjeta" method="post" action="{{ route('usuarios.crear') }}" aria-labelledby="t-nuevo">
      @csrf
      <header class="tarjeta-encabezado">
        <h2 class="tarjeta-titulo" id="t-nuevo">Nuevo usuario</h2>
      </header>
      <div class="tarjeta-contenido">
        <div class="campos">
          <div class="campo">
            <label for="name">Nombre <span class="requerido" aria-hidden="true">*</span></label>
            <input class="control" id="name" name="name" required autocomplete="off" value="{{ old('name') }}" @error('name') aria-invalid="true" aria-describedby="name-error" @enderror>
            @error('name')<p class="campo-error" id="name-error">@icono('circle-alert'){{ $message }}</p>@enderror
          </div>
          <div class="campo">
            <label for="email">Correo <span class="requerido" aria-hidden="true">*</span></label>
            <input class="control" id="email" name="email" type="email" required autocomplete="off" value="{{ old('email') }}" @error('email') aria-invalid="true" aria-describedby="email-error" @enderror>
            @error('email')<p class="campo-error" id="email-error">@icono('circle-alert'){{ $message }}</p>@enderror
          </div>
        </div>
      </div>
      <footer class="tarjeta-pie">
        <button class="btn btn-primario" type="submit">Crear usuario</button>
      </footer>
    </form>

    @if ($usuarios->isEmpty())
      <div class="vacio">
        <span class="vacio-icono">@icono('inbox')</span>
        <h3>Todavía no hay usuarios</h3>
      </div>
    @else
      <div class="tabla-contenedor">
        <table class="tabla tabla-tarjetas">
          <caption class="solo-lector">Usuarios registrados</caption>
          <thead><tr><th scope="col">Nombre</th><th scope="col">Correo</th><th scope="col">Creado</th><th scope="col"><span class="solo-lector">Acciones</span></th></tr></thead>
          <tbody>
            @foreach ($usuarios as $usuario)
              <tr>
                <td data-columna="Nombre" class="celda-larga">{{ $usuario->name }}</td>
                <td data-columna="Correo"><span class="codigo">{{ $usuario->email }}</span></td>
                <td data-columna="Creado"><time datetime="{{ $usuario->created_at->toIso8601String() }}">{{ $usuario->created_at->diffForHumans() }}</time></td>
                <td data-columna="Acciones" class="num">
                  <form method="post" action="{{ route('usuarios.borrar', $usuario) }}" data-esqueleto="tabla">
                    @csrf @method('delete')
                    <button class="btn btn-fantasma btn-icono btn-sm" type="submit" aria-label="Borrar a {{ $usuario->name }}" data-tooltip="Borrar" data-tooltip-alinear="fin" data-peligro>@icono('trash-2')</button>
                  </form>
                </td>
              </tr>
            @endforeach
          </tbody>
        </table>
      </div>
      <nav class="paginacion" aria-label="Páginas">
        <span>Mostrando {{ $usuarios->firstItem() }}–{{ $usuarios->lastItem() }} de {{ $usuarios->total() }}</span>
        <ul>
          <li>
            @if ($usuarios->onFirstPage())
              <span aria-disabled="true">@icono('chevron-left')<span class="solo-lector">Anterior</span></span>
            @else
              <a href="{{ $usuarios->previousPageUrl() }}" data-esqueleto="tabla">@icono('chevron-left')<span class="solo-lector">Anterior</span></a>
            @endif
          </li>
          @foreach ($usuarios->getUrlRange(1, $usuarios->lastPage()) as $pagina => $url)
            <li><a href="{{ $url }}" data-esqueleto="tabla" @if ($pagina === $usuarios->currentPage()) aria-current="page" @endif>{{ $pagina }}</a></li>
          @endforeach
          <li>
            @if ($usuarios->hasMorePages())
              <a href="{{ $usuarios->nextPageUrl() }}" data-esqueleto="tabla">@icono('chevron-right')<span class="solo-lector">Siguiente</span></a>
            @else
              <span aria-disabled="true">@icono('chevron-right')<span class="solo-lector">Siguiente</span></span>
            @endif
          </li>
        </ul>
      </nav>
    @endif
  </div>
</x-layouts.app>
