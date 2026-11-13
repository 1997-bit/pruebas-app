<?php

use App\Http\Controllers\LaboratorioController;
use Illuminate\Support\Facades\Route;

Route::controller(LaboratorioController::class)->group(function () {
    Route::get('/', 'pruebas')->name('pruebas');
    Route::get('/calificaciones', 'calificaciones')->name('calificaciones');
    Route::get('/usuarios', 'usuarios')->name('usuarios');
    Route::post('/usuarios', 'crearUsuario')->name('usuarios.crear');
    Route::post('/usuarios/prueba', 'crearUsuariosDePrueba')->name('usuarios.prueba');
    Route::delete('/usuarios/{usuario}', 'borrarUsuario')->whereNumber('usuario')->name('usuarios.borrar');
    Route::post('/pruebas', 'ejecutarPruebas')->name('pruebas.ejecutar');
    Route::post('/pruebas/iniciar', 'iniciarPruebas')->name('pruebas.iniciar');
    Route::get('/pruebas/estado', 'estadoPruebas')->name('pruebas.estado');
});

Route::get('/perfil', function () {
    return response()->json(['nombre' => auth()->user()->name]);
})->middleware('auth');
