# pruebas-app

Laboratorio de Ingeniería de Software Aplicada III: instalación de Laravel para uso de pruebas. El enunciado está en [`../docs/enunciado.md`](../docs/enunciado.md) y la máquina de estados de la ejecución de pruebas en [`docs/ejecucion.md`](docs/ejecucion.md).

## Requisitos

- PHP 8.3+ y Composer
- Node.js y npm
- MariaDB corriendo en `127.0.0.1:3306`

## Base de datos

La app usa dos bases: `pruebas_app` (desarrollo) y `pruebas_app_test` (pruebas, fijada en `phpunit.xml`). Ambas con el usuario `laravel`:

```sql
CREATE DATABASE pruebas_app;
CREATE DATABASE pruebas_app_test;
CREATE USER 'laravel'@'localhost' IDENTIFIED BY 'laravel';
GRANT ALL PRIVILEGES ON pruebas_app.* TO 'laravel'@'localhost';
GRANT ALL PRIVILEGES ON pruebas_app_test.* TO 'laravel'@'localhost';
```

Pon la contraseña en `DB_PASSWORD` del `.env`.

## Instalación

```bash
composer setup
```

Instala dependencias de PHP y npm, crea `.env` desde `.env.example`, genera `APP_KEY`, migra la base y compila los assets.

## Levantar el servidor

```bash
composer dev
```

Arranca el servidor de Laravel y Vite juntos. La app queda en <http://localhost:8000>.

Solo el servidor PHP (con los assets ya compilados por `npm run build`):

```bash
php artisan serve
```

## Pruebas

```bash
composer test          # limpia la caché de config y corre todo
php artisan test       # corre todo
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature
php artisan test --filter=UsuarioTest
```

También se pueden lanzar desde la página **Pruebas** de la app (`/pruebas`).

| Archivo | Tipo |
|---|---|
| `tests/Unit/CalificacionTest.php` | Unit |
| `tests/Feature/UsuarioTest.php` | Feature |
| `tests/Feature/PerfilTest.php` | Feature |

Crear una prueba nueva:

```bash
php artisan make:test NombreTest          # Feature
php artisan make:test NombreTest --unit   # Unit
```

Las pruebas deben extender `Tests\TestCase` para usar los helpers del framework (`RefreshDatabase`, `actingAs`, etc.).

## Otros comandos útiles

```bash
php artisan migrate:fresh --seed   # recrea la base de desarrollo
vendor/bin/pint                    # formatea el código
```
