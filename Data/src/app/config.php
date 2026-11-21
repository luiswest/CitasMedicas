<?php
use Psr\Container\ContainerInterface;

/*
 * Cambios para despliegue:
 *  - DB_PORT: las BD gestionadas (Aiven, Azure...) usan puertos distintos de 3306.
 *  - DB_SSL / DB_SSL_CA / DB_SSL_VERIFY: las BD en la nube exigen conexión TLS.
 * Con el .env actual (sin esas variables) el comportamiento es el mismo de antes.
 */
$container->set('config_bd', function() {
    return (object) [
        'host' => $_ENV['DB_HOST'],
        'port' => (int) ($_ENV['DB_PORT'] ?? 3306),
        'username' => $_ENV['DB_USER'],
        'password' => $_ENV['DB_PASSW'],
        'database' => $_ENV['DB_NAME'],
        'charset' =>  'utf8mb4',
        'ssl' => filter_var($_ENV['DB_SSL'] ?? false, FILTER_VALIDATE_BOOLEAN),
        'ssl_ca' => $_ENV['DB_SSL_CA'] ?? '',
        'ssl_verify' => isset($_ENV['DB_SSL_VERIFY'])
            ? filter_var($_ENV['DB_SSL_VERIFY'], FILTER_VALIDATE_BOOLEAN)
            : null,
    ];
});

// Opciones PDO para TLS, compartidas por conexion.php y eloquent.php
$container->set('pdo_ssl_options', function(ContainerInterface $c) {
    $conf = $c->get('config_bd');
    if (!$conf->ssl) {
        return [];
    }

    // PHP >= 8.4 usa Pdo\Mysql::*; las constantes PDO::MYSQL_* están obsoletas
    $attrCa = defined('Pdo\Mysql::ATTR_SSL_CA')
        ? \Pdo\Mysql::ATTR_SSL_CA : PDO::MYSQL_ATTR_SSL_CA;
    $attrVerify = defined('Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT')
        ? \Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT : PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT;

    $customCa = $conf->ssl_ca !== '';
    $ca = $customCa ? $conf->ssl_ca : '/etc/ssl/certs/ca-certificates.crt';
    // Con el CA del proveedor se verifica el certificado; sin él solo se cifra.
    $verify = $conf->ssl_verify ?? $customCa;

    return [
        $attrCa => $ca,
        $attrVerify => $verify,
    ];
});
