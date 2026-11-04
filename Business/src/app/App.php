<?php

use Slim\Factory\AppFactory;
use DI\Container;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
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

$app->add(new JwtAuthentication(
	new Options(isSecure: false),
	new FirebaseDecoder(new Secret($_ENV['KEY'], 'HS256')),
	[new RequestPathRule(
        ['/'], 
        ['/api/auth', '/api/medicos'])]
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

 $app->add(function (ServerRequestInterface $request, RequestHandlerInterface $handler) use ($app): ResponseInterface {
	$origin = $request->getHeaderLine('Origin');
	//var_dump($origin); // Para depuración, puedes eliminarlo en producción
	$allowedOrigin = $_ENV['CORS_ALLOWED_ORIGIN'] ?? 'http://localhost:4200'; // Cambia esto según tu configuración

	if ($request->getMethod() === 'OPTIONS' && $origin === $allowedOrigin) {
		$response = $app->getResponseFactory()->createResponse(204);
	} else {
		$response = $handler->handle($request);
	}

	if ($origin !== $allowedOrigin) {
		return $response;
	}

	return $response
		->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
		->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
		->withHeader('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, Origin, X-Requested-With')
		->withHeader('Vary', 'Origin');
}); 
/*
$app->add(function (ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface {
    $response = $handler->handle($request);
    
    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        ->withHeader('Access-Control-Allow-Credentials', 'true');
});
*/
// Capturar explícitamente todas las peticiones OPTIONS (Preflight)  
// //Es necesario para que funcione correctamente el CORS en algunos navegadores
 $app->options('/{routes:.+}', function (ServerRequestInterface $request, ResponseInterface $response, array $args): ResponseInterface {
return $response->withStatus(204);
 return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        ->withHeader('Access-Control-Allow-Credentials', 'true');
}); 

$app->run();