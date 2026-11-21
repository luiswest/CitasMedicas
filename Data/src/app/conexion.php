<?php
use Psr\Container\ContainerInterface;

$container->set('base_datos', function(ContainerInterface $c) {
    $conf = $c->get('config_bd');

    $opc = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ] + $c->get('pdo_ssl_options');

    $dsn = "mysql:host={$conf->host};port={$conf->port};dbname={$conf->database};charset={$conf->charset}";

    try {
        $conexion = new PDO($dsn, $conf->username, $conf->password, $opc);
    } catch (PDOException $e) {
        throw new RuntimeException('No fue posible conectar con la base de datos.', 0, $e);
    }

    return $conexion;
});
