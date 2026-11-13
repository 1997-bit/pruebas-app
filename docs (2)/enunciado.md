# UNIVERSIDAD TECNOLÓGICA DE PANAMÁ

**FACULTAD DE INGENIERÍA DE SISTEMAS COMPUTACIONALES**
**DEPARTAMENTO DE SISTEMAS DE INFORMACIÓN, CONTROL Y EVALUACIÓN DE RECURSOS INFORMÁTICOS**

## Guía de laboratorio para INGENIERÍA DE SOFTWARE APLICADA III

- **Profesor de Proyectos:** Arturo Murillo
- **Fechas de entrega:** Inicio: 30/10/2026 — Fin: 11/11/2026
- **Título:** Instalación de Laravel para uso de pruebas

## Objetivos

El propósito principal de instalar Laravel es tener un entorno de desarrollo PHP moderno que incluya PHPUnit (o Pest) preconfigurado y un directorio `tests/` listo para usar. Esto te permite verificar que la instalación fue correcta y, más importante, escribir pruebas para tu lógica de negocio, API, base de datos, etc., sin necesidad de configurar todo desde cero.

### 🛠️ ¿Cómo se hacen las pruebas?

Una vez instalado Laravel, el flujo básico para probar es muy directo:

1. **Verificar la instalación ejecutando las pruebas existentes:** Laravel trae pruebas de ejemplo (como verificar que la página de inicio responde con un código 200). Puedes ejecutarlas con el comando `php artisan test` o `./vendor/bin/phpunit`.
2. **Crear tus propias pruebas:** Los archivos de prueba se colocan en el directorio `tests/`. Puedes generar una nueva prueba con `php artisan make:test NombreDeTuPrueba`. Laravel distingue entre pruebas **Unit** (unitarias, para clases aisladas) y **Feature** (de características, que simulan peticiones HTTP a tu aplicación).
3. **Herramientas clave para probar:** Laravel incluye helpers muy útiles para las pruebas, como `RefreshDatabase` (para resetear la base de datos en cada test) y `actingAs` (para autenticar a un usuario).

### 💡 Un detalle importante

Aunque `php artisan test` es el comando recomendado porque está optimizado para Laravel, si en tus pruebas usas directamente la clase `PHPUnit\Framework\TestCase`, perderás algunas de las facilidades que ofrece el framework. Para aprovechar la integración completa, asegúrate de que tus clases de prueba extiendan `Tests\TestCase`.

**En resumen:** instalar Laravel te da un entorno listo para desarrollar y para probar. No necesitas instalar nada extra para empezar a hacer pruebas básicas; solo ejecutar los comandos y escribir tus casos en el directorio `tests/`.

## Video guía

<https://www.youtube.com/watch?v=rn2LCOeNPds>

## Indicaciones

- Grupo de dos personas.
- El estudiante debe estar preparado para exponer.
- Las presentaciones se harán en las sesiones de clase.
- El resultado se debe entregar en Word.
- Debe utilizar el ejemplo brindado en clase: *Ejemplo _QUE ES OLAP DATA MARTS DATA MINING_.docx*

## Escala de evaluación para trabajos en grupo e individual

**Evaluación:** valor 100 puntos — 50% exposición/práctica con el grupo y 50% trabajo escrito (manual de usuario).

### Matriz de evaluación

| Elemento de evaluación          | 1 Deficiente | 2 Regular | 3 Bueno | 4 Muy bueno | 5 Excelente |
|---------------------------------|:------------:|:---------:|:-------:|:-----------:|:-----------:|
| Exposición general del grupo    |              |           |         |             |             |
| Aportes del grupo               |              |           |         |             |             |
| Uso práctico de la teoría       |              |           |         |             |             |
| Conocimiento del tema           |              |           |         |             |             |
| Calidad y pertinencia           |              |           |         |             |             |
| **Totales**                     |              |           |         |             |             |
| **Final**                       |              |           |         |             |             |

**Integrante(s) evaluado(s):**
