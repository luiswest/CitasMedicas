<?php

declare(strict_types=1);

use Illuminate\Database\Capsule\Manager as Capsule;
use Psr\Container\ContainerInterface;

$container->set('eloquent', function (ContainerInterface $c): Capsule {
    $config = $c->get('config_bd');
    $capsule = new Capsule();

    $capsule->addConnection([
        'driver' => 'mysql',
        'host' => $config->host,
        'port' => $config->port,
        'database' => $config->database,
        'username' => $config->username,
        'password' => $config->password,
        'charset' => $config->charset,
        'collation' => 'utf8mb4_unicode_ci',
        'prefix' => '',
        'options' => $c->get('pdo_ssl_options'),
    ]);

    $capsule->setAsGlobal();
    $capsule->bootEloquent();

    return $capsule;
});
