@props(['sobreColor' => false, 'tamano' => 24])
@php
    // El bicho de papel recortado. Sobre color (marca-icono): blanco con el ojo calado. Si no: rojo de Laravel
    $id = 'recorte-'.uniqid();
    $cuerpo = $sobreColor ? 'currentColor' : 'var(--primario)';
    $corte = $sobreColor ? 'var(--primario)' : 'var(--fondo)';
    $anillo = $sobreColor ? 'var(--primario)' : '#fff';
    $pupila = $sobreColor ? 'currentColor' : '#111';
@endphp
<svg {{ $attributes }} xmlns="http://www.w3.org/2000/svg" viewBox="24 6 192 192" width="{{ $tamano }}" height="{{ $tamano }}" aria-hidden="true" focusable="false">
  <defs>
    <filter id="{{ $id }}" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" result="ruido"/>
      <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <g filter="url(#{{ $id }})">
    <g fill="{{ $cuerpo }}">
      <polygon points="58,116 70,121 57,140 40,152 30,149 36,143 50,135"/>
      <polygon points="94,122 105,123 104,146 99,162 87,162 90,155 95,145"/>
      <polygon points="127,117 139,113 150,134 164,146 160,153 147,151 134,140"/>
      <polygon points="31,117 37,96 52,78 75,63 101,57 125,61 144,73 155,93 151,117 130,126 98,129 63,128 42,125"/>
      <polygon points="145,82 157,66 178,62 195,73 199,93 188,108 168,111 152,104"/>
      <polygon points="168,64 170,47 181,36 187,39 178,50 177,65"/>
      <polygon points="184,66 195,52 209,47 211,52 199,58 191,70"/>
    </g>
    <polyline points="102,59 98,82 101,104 97,127" fill="none" stroke="{{ $corte }}" stroke-width="3.2" stroke-linejoin="bevel"/>
    <polygon points="168,76 175,70 184,70 191,76 192,86 187,94 178,96 170,92 166,84" fill="{{ $anillo }}"/>
    <polygon points="174,78 180,75 186,79 187,86 182,91 176,90 172,85" fill="{{ $pupila }}"/>
  </g>
</svg>
