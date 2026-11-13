@props(['titulo'])
@php
    $secciones = [
        ['ruta' => 'pruebas', 'texto' => 'Pruebas', 'icono' => 'flask-conical', 'atajo' => 'g t'],
        ['ruta' => 'calificaciones', 'texto' => 'Calificaciones', 'icono' => 'graduation-cap', 'atajo' => 'g c'],
        ['ruta' => 'usuarios', 'texto' => 'Usuarios', 'icono' => 'users', 'atajo' => 'g u'],
    ];
@endphp
<!doctype html>
<html lang="es-PA" data-sidebar="{{ request()->cookie('sidebar') === 'colapsado' ? 'colapsado' : 'expandido' }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#fdfdfc" media="(prefers-color-scheme: light) and (width < 37.5rem)">
<meta name="theme-color" content="#f8f8f6" media="(prefers-color-scheme: light) and (width >= 37.5rem)">
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark) and (width < 37.5rem)">
<meta name="theme-color" content="#111110" media="(prefers-color-scheme: dark) and (width >= 37.5rem)">
<link rel="icon" href="{{ asset('favicon.svg') }}" type="image/svg+xml">
<link rel="icon" href="{{ asset('favicon.ico') }}" sizes="32x32">
<title>{{ $titulo }} · Pruebas Laravel</title>
<link rel="stylesheet" href="{{ asset('assets/diseno/css/tokens.css') }}">
<link rel="stylesheet" href="{{ asset('assets/diseno/css/base.css') }}">
<link rel="stylesheet" href="{{ asset('assets/diseno/css/componentes.css') }}">
<link rel="stylesheet" href="{{ asset('assets/diseno/css/layout.css') }}">
<link rel="stylesheet" href="{{ asset('css/laravel.css') }}">
<link rel="stylesheet" href="{{ asset('css/prueba-sidebar.css') }}">{{-- PRUEBA: panel encima del sidebar --}}
<script src="{{ asset('assets/diseno/js/tema.js') }}"></script>
<script type="module" src="{{ asset('assets/diseno/js/interfaz.js') }}"></script>
<script type="module" src="{{ asset('assets/diseno/js/graficos.js') }}"></script>
<script type="module" src="{{ asset('assets/diseno/js/atajos.js') }}"></script>
<script type="module" src="{{ asset('assets/diseno/js/resaltar.js') }}"></script>
</head>
<body class="app">
<a class="saltar" href="#principal">Saltar al contenido</a>
<aside class="sidebar" id="sidebar">
  <div class="sidebar-cabecera">
    <div class="proyecto-menu">
      <button class="sidebar-boton sidebar-marca" type="button" popovertarget="menu-proyecto" data-etiqueta="Pruebas Laravel">
        <span class="marca-icono" aria-hidden="true"><x-logo sobre-color /></span>
        <span class="sidebar-texto sidebar-dos-lineas"><strong>Pruebas Laravel</strong><small>Laravel {{ app()->version() }}</small></span>
        @icono('chevrons-up-down', 'flecha-usuario')
      </button>
      <div class="proyecto-flotante" id="menu-proyecto" popover data-lado="abajo">
        <p class="proyecto-flotante-titulo">Proyectos</p>
        <a class="sidebar-boton" href="{{ route('pruebas') }}" aria-current="true"><span class="sidebar-texto">Pruebas Laravel</span>@icono('check')</a>
      </div>
    </div>
  </div>
  <nav class="sidebar-contenido" aria-label="Navegación principal">
    <div class="sidebar-grupo">
      <h2 class="sidebar-grupo-titulo">Laboratorio</h2>
      <ul class="sidebar-menu">
        @foreach ($secciones as $s)
          <li><a class="sidebar-boton" href="{{ route($s['ruta']) }}" @if (request()->routeIs($s['ruta'])) aria-current="page" @endif data-etiqueta="{{ $s['texto'] }}" data-atajo="{{ $s['atajo'] }}" data-atajo-texto="Ir a {{ mb_strtolower($s['texto']) }}">@icono($s['icono'])
            <span class="sidebar-texto">{{ $s['texto'] }}</span></a></li>
        @endforeach
      </ul>
    </div>
  </nav>
  <div class="sidebar-pie">
    <div class="usuario-menu">
      <button class="sidebar-boton sidebar-usuario" type="button" popovertarget="menu-usuario" data-etiqueta="Ingeniería de Software III">
        <span class="avatar-cuadrado" aria-hidden="true">IS</span>
        <span class="sidebar-texto sidebar-dos-lineas"><strong>Ing. de Software III</strong><small>UTP · {{ DB::connection()->getDatabaseName() }}</small></span>
        @icono('chevrons-up-down', 'flecha-usuario')
      </button>
      <div class="usuario-flotante" id="menu-usuario" popover data-lado="arriba">
        <button class="sidebar-boton" id="tema" type="button">@icono('moon', 'tema-luna')@icono('sun', 'tema-sol')<span class="tema-luna">Modo oscuro</span><span class="tema-sol">Modo claro</span></button>
      </div>
    </div>
  </div>
</aside>
<div class="sidebar-fondo velo" id="sidebar-fondo" hidden></div>

<div class="app-cuerpo">
  <header class="app-barra">
    <button class="barra-boton" id="sidebar-alternar" type="button" aria-controls="sidebar" aria-expanded="true" aria-label="Mostrar u ocultar menú"
            data-atajo="Mod+b" data-atajo-texto="Mostrar u ocultar menú" data-tooltip="Menú" data-tooltip-lado="abajo" data-tooltip-alinear="inicio">@icono('panel-left')
    </button>
    <span class="barra-separador" aria-hidden="true"></span>
    <nav aria-label="Ruta de navegación">
      <ol class="migas">
        <li><a href="{{ route('pruebas') }}">Pruebas Laravel</a>@icono('chevron-right', 'miga-separador')
        </li>
        <li><span aria-current="page">{{ $titulo }}</span></li>
      </ol>
    </nav>
  </header>

  <main class="app-principal" id="principal" tabindex="-1">
    {{ $slot }}
  </main>
  <nav class="barra-inferior" aria-label="Secciones">
    @foreach ($secciones as $s)
      <a href="{{ route($s['ruta']) }}" @if (request()->routeIs($s['ruta'])) aria-current="page" @endif>@icono($s['icono'])<span>{{ $s['texto'] }}</span></a>
    @endforeach
  </nav>
</div>

<dialog class="dialogo paleta" id="paleta" aria-label="Paleta de comandos">
  <div class="paleta-campo">
    @icono('search')
    <input class="paleta-entrada" type="text" role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-autocomplete="list"
           placeholder="Escriba un comando o busque…" aria-label="Buscar comando">
  </div>
  <ul class="paleta-lista" id="paleta-lista" role="listbox" aria-label="Resultados">
    @foreach ($secciones as $i => $s)
      <li role="option" id="paleta-{{ $i }}" data-grupo="Ir a" data-destino="{{ route($s['ruta']) }}"><span>{{ $s['texto'] }}</span></li>
    @endforeach
    <li role="option" id="paleta-tema" data-grupo="Acciones" data-destino="accion:tema"><span>Cambiar tema</span></li>
    <li role="option" id="paleta-menu" data-grupo="Acciones" data-destino="accion:menu"><span>Mostrar u ocultar menú</span></li>
    <li role="option" id="paleta-atajos" data-grupo="Acciones" data-destino="accion:atajos"><span>Ver atajos</span></li>
  </ul>
  <p class="paleta-vacio" hidden>Sin resultados.</p>
  <p class="solo-lector" role="status" id="paleta-estado"></p>
</dialog>

@if (session('aviso'))
  <dialog open class="alerta alerta-{{ session('aviso_tono', 'exito') }} aviso-flotante" id="aviso" aria-label="Aviso">@icono(session('aviso_tono') === 'error' ? 'circle-x' : 'circle-check')
    <p class="alerta-titulo">{{ session('aviso') }}</p>
    <div class="alerta-accion">
      <button class="btn btn-fantasma btn-icono btn-sm" type="button" command="close" commandfor="aviso" aria-label="Cerrar aviso" data-tooltip="Cerrar" data-tooltip-alinear="fin">@icono('x')</button>
    </div>
  </dialog>
@endif
</body>
</html>
