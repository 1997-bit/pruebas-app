# Ejecución de pruebas: dos vistas

La misma máquina (`App\Enums\EstadoEjecucion`, manejada por `App\Support\Ejecucion`) vista de dos formas.

## 1. Diagrama de estados

Los nodos son estados; las flechas, operaciones. Responde: ¿en qué estado está? ¿Cómo llego de X a Y?

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Ninguna
    Ninguna --> Corriendo: iniciar()
    Corriendo --> Corriendo: observar eventos.txt
    Corriendo --> Aprobada: fin.txt = 0
    Corriendo --> Fallida: fin.txt ≠ 0, con pruebas
    Corriendo --> Error: fin.txt ≠ 0, sin pruebas
    Corriendo --> Error: 2 min sin avance
    Aprobada --> Corriendo: iniciar()
    Fallida --> Corriendo: iniciar()
    Error --> Corriendo: iniciar()
```

## 2. Diagrama de operaciones

Los nodos son operaciones; los cables, lo que cada una recibe y devuelve. Responde: ¿qué puedo hacer ahora? ¿En qué estado puedo hacer Z?

```mermaid
flowchart LR
    inicio(( )) -- Ninguna --> iniciar
    iniciar[iniciar] -- Corriendo --> observar
    iniciar -. "409: ya corre" .-> unirse
    unirse[unirse] -- Corriendo --> observar
    observar[observar] -- Corriendo --> observar
    observar -- "Terminada<br/>Aprobada · Fallida · Error" --> guardar
    guardar[guardar] -- "En el historial" --> iniciar
    guardar -. "otra vez: null" .-> guardar
```

## Qué se puede en cada estado

| Estado | Se puede | Se rechaza |
|---|---|---|
| Ninguna | `iniciar()`, `correrYEsperar()` | `guardar()` → null |
| Corriendo | observar `public/ejecucion/eventos.txt`, `estado()`; otra pestaña se une con el 409 | `iniciar()` → 409; `correrYEsperar()` → "Ya hay una ejecución en curso"; `guardar()` → null |
| Aprobada · Fallida · Error | `guardar()` una vez; `iniciar()`, `correrYEsperar()` | `guardar()` otra vez → null |

Las guardias son en tiempo de ejecución: el estado vive en archivos, en la base y en otras pestañas.
