<?php

use Slim\Factory\AppFactory;
use DI\Container;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use JimTools\JwtAuth\Decoder\FirebaseDecoder;
use JimTools\JwtAuth\Exceptions\AuthorizationException;
use JimTools\JwtAuth\Middleware\JwtAuthentication;
use JimTools\JwtAuth\Options;
use JimTools\JwtAuth\Rules\RequestPathRule;
use JimTools\JwtAuth\Secret;

require __DIR__ . '/../../vendor/autoload.php';


$dotenv = Dotenv\Dotenv::createImmutable('/var/www/html');
$dotenv->load();

$container = new Container();

AppFactory::setContainer($container);

$app = AppFactory::create();
$app->addRoutingMiddleware();
$app->addBodyParsingMiddleware();

require_once "config.php";
require_once "routes.php";

$app->add(new JwtAuthentication(
	new Options(isSecure: false),
	new FirebaseDecoder(new Secret($_ENV['KEY'], 'HS256')),
	[new RequestPathRule(
        ['/'], 
        ['/api/auth'])]
));

$errorMiddleware = $app->addErrorMiddleware(true, true, true);
$errorMiddleware->setErrorHandler(AuthorizationException::class,
	function ($request, AuthorizationException $exception, bool $displayErrorDetails) use ($app) {
		$response = $app->getResponseFactory()->createResponse(401);
		$response->getBody()->write(json_encode([
			'error' => 'Token inválido o ausente.',
		], JSON_UNESCAPED_UNICODE));
		return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
	}
);

/* $app->add(function (Request $request, RequestHandlerInterface $handler) use ($app): Response {
	$origin = $request->getHeaderLine('Origin');
	
	var_dump($origin); die();
$allowedOrigins = [
    'http://localhost:4200',   // Angular web (desarrollo)
    'https://localhost',       // Capacitor Android
    'http://localhost',        // Capacitor Android con androidScheme: 'http'
    // 'https://tu-dominio.com' // Angular web en producción
];
	$configuredOrigins = $_ENV['CORS_ALLOWED_ORIGINS'] ?? $_ENV['CORS_ALLOWED_ORIGIN'] ?? '';
	$allowedOrigins = array_unique(array_merge(
		['http://localhost:4200', 'http://localhost'],
		array_filter(array_map('trim', explode(',', $configuredOrigins)))
	));
	$isAllowedOrigin = in_array($origin, $allowedOrigins, true);

	if ($request->getMethod() === 'OPTIONS' && $isAllowedOrigin) {
		$response = $app->getResponseFactory()->createResponse(204);
	} else {
		$response = $handler->handle($request);
	}

	if (!$isAllowedOrigin) {
		return $response;
	}

	return $response
		->withHeader('Access-Control-Allow-Origin', $origin)
		->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
		->withHeader('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, Origin, X-Requested-With')
		->withHeader('Vary', 'Origin');
});  */

 $app->options('/{routes:.+}', function (Request $request, Response $response) : Response {
    return $response;
}); 

// CORS wraps the error and JWT middleware so their responses include CORS headers.
$app->add(function (Request $request, RequestHandlerInterface $handler) use ($app) : Response {
    $allowedOrigins = [
        'http://localhost:4200',  // Angular web (desarrollo)
        'https://localhost',      // Capacitor Android (androidScheme por defecto)
        'http://localhost',       // Capacitor Android si usas androidScheme: 'http'
    ];

    $origin = $request->getHeaderLine('Origin');
    $isAllowedOrigin = in_array($origin, $allowedOrigins, true);

    if ($request->getMethod() === 'OPTIONS') {
        $response = $app->getResponseFactory()->createResponse(204);
    } else {
        $response = $handler->handle($request);
    }

    if (!$isAllowedOrigin) {
        return $response;
    }

    $response = $response
        ->withHeader('Access-Control-Allow-Origin', $origin)
        ->withHeader('Vary', 'Origin')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->withHeader('Access-Control-Max-Age', '86400');

    return $response;
});

$app->run();