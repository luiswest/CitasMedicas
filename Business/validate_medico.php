<?php
require 'vendor/autoload.php';

$data = [
    'especialidad_id' => 1,
    'nombre_completo' => 'Ana Maria Perez',
    'licencia' => 'LIC-123',
    'username' => 'ana123456',
    'password' => 'Abcdef1#',
    'telefono' => '2222-3333'
];

var_export((new App\Validators\MedicoValidator())->validate($data));
echo PHP_EOL;

$invalid = [
    'especialidad_id' => 0,
    'nombre_completo' => 'A',
    'licencia' => '',
    'username' => 'abc',
    'password' => '123',
    'telefono' => '123'
];

var_export((new App\Validators\MedicoValidator())->validate($invalid));
