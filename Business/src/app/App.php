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

$app->add(function (Request $request, RequestHandlerInterface $handler) use ($app): Response {
	$origin = $request->getHeaderLine('Origin');
	// Orígenes permitidos separados por coma:
	//  - http://localhost:4200 -> ng serve (web)
	//  - http://localhost      -> WebView de Capacitor en Android (androidScheme: 'http')
	//  - https://localhost / capacitor://localhost -> esquemas por defecto de Capacitor (Android / iOS)
	$allowedOrigins = array_map('trim', explode(',',
		$_ENV['CORS_ALLOWED_ORIGINS']
			?? $_ENV['CORS_ALLOWED_ORIGIN']
			?? 'http://localhost:4200,http://localhost:4300,http://localhost,https://localhost,capacitor://localhost,https://citas-medicas-m7k1.onrender.com'
	));
	$isAllowed = $origin !== '' && in_array($origin, $allowedOrigins, true);

	if ($request->getMethod() === 'OPTIONS' && $isAllowed) {
		$response = $app->getResponseFactory()->createResponse(204);
	} else {
		$response = $handler->handle($request);
	}

	if (!$isAllowed) {
		return $response;
	}

	return $response
		->withHeader('Access-Control-Allow-Origin', $origin)
		->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
		->withHeader('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, Origin, X-Requested-With')
		->withHeader('Vary', 'Origin');
});

$app->run();