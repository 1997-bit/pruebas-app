<?php

// Tipos de prueba, como el catálogo de safeguard. La clave es el #[Group] de PHPUnit: php artisan test --group=smoke
return [
    'tipos' => [
        'unitaria' => ['texto' => 'Unitaria', 'sigla' => 'UNI'],
        'integracion' => ['texto' => 'Integración', 'sigla' => 'INT'],
        'sistema' => ['texto' => 'Sistema', 'sigla' => 'SIS'],
        'aceptacion' => ['texto' => 'Aceptación', 'sigla' => 'ACE'],
        'mantenimiento' => ['texto' => 'Mantenimiento', 'sigla' => 'MAN'],
        'regresion' => ['texto' => 'Regresión', 'sigla' => 'REG'],
        'smoke' => ['texto' => 'Smoke', 'sigla' => 'SMK'],
        'performance' => ['texto' => 'Performance', 'sigla' => 'PER'],
        'seguridad' => ['texto' => 'Seguridad', 'sigla' => 'SEG'],
    ],
];
