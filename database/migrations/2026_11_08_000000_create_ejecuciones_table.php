<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Historial de ejecuciones de PHPUnit, en columnas: el panel lee una fila con sus conteos, sin traer cada prueba.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ejecuciones', function (Blueprint $table) {
            $table->id();
            $table->string('estado', 10);                      // App\Enums\EstadoEjecucion, terminada
            $table->unsignedSmallInteger('total');
            $table->unsignedSmallInteger('aprobadas');
            $table->unsignedSmallInteger('fallidas');
            $table->decimal('duracion', 8, 3);                 // segundos
            $table->text('salida')->nullable();                // solo con estado error
            $table->timestamp('created_at')->useCurrent()->index();
        });

        Schema::create('ejecucion_pruebas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ejecucion_id')->constrained('ejecuciones')->cascadeOnDelete();
            $table->string('clase', 100);
            $table->string('metodo', 150);
            $table->boolean('paso');
            $table->decimal('t', 8, 3);                        // segundo en que terminó, desde el inicio
            $table->unsignedInteger('ms');
            $table->text('mensaje')->nullable();               // solo si falló
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ejecucion_pruebas');
        Schema::dropIfExists('ejecuciones');
    }
};
