<?php
declare(strict_types=1);
namespace App\controllers;
use Firebase\JWT\JWT;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Services\DataService;

final class Auth
{
    public function __construct(private ContainerInterface $container) { }
    private function generateTokens(string $id, string $username, int $rol_id): array {
        $now = time();
        $config = $this->container->get('config');
        $payload = [
            'iss' => 'citas-medicas-business',
            'iat' => $now,
            'exp' => $now + $config->jwt_ttl,
            'sub' => $id,
            'username' => $username,
            'rol_id' => $rol_id,
        ];
            $payloadRef = [
            'iss' => 'citas-medicas-business',
            'iat' => $now,
            'sub' => $id,
        ];
        return [
            'token' => JWT::encode($payload, $config->key, 'HS256'),
            'tkRef' => JWT::encode($payloadRef, $config->key, 'HS256'),
        ];
    }

    public function login(Request $request, Response $response): Response {
        $request->getBody()->rewind();{
        $data = $request->getParsedBody();
        $data = is_array($data) ? $data : [];
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($username === '' || $password === '') {
            return $this->json($response, [
                'error' => 'El usuario y la contraseña son obligatorios.',
            ], 422);
        }
        
        try {
            $service = $this->container->get(DataService::class);
            $upstream = $service->post('auth/credentials', json_encode([
                'username' => $username,
                'password' => $password,
            ], JSON_THROW_ON_ERROR));
            
            $credentials = json_decode((string) $upstream->getBody(), true);

            if ($upstream->getStatusCode() !== 200 || !is_array($credentials)) {
                return $this->json($response, [
                    'error' => 'Credenciales inválidas.',
                ], 401);
            }

            $tokens = $this->generateTokens((string)$credentials['id'], $credentials['username'], $credentials['rol_id']);

            //hay que guardar el token de refresco
//            $this->saveTokenRefresh((string)$credentials['id'], $tokens['tkRef']);
            $upstream = $service->put('auth/tkref/'.$credentials['id'], json_encode(
                ['tkRef' => $tokens['tkRef']], JSON_THROW_ON_ERROR));
            
            return $this->json($response, $tokens,200);
        } catch (ConnectException) {
            return $this->json($response, ['error' => 'El servicio de datos no está disponible.'], 502);
        } catch (RequestException) {
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos.'], 502);
        }
    }
    public function loggout(Request $request, Response $response, $args): Response {
        try {
                $service = $this->container->get(DataService::class);
                //$this->saveTokenRefresh($credentials['id'], $tokens['tkRef']);
                $upstream = $service->put('auth/tkref/'.$args['id'], json_encode(
                ['tkRef' => ""], JSON_THROW_ON_ERROR));  
                return $this->json($response, ['message' => 'Sesión cerrada correctamente.'],200);              

        } catch (ConnectException) {
            return $this->json($response, ['error' => 'El servicio de datos no está disponible.'], 502);
        } catch (RequestException) {
            return $this->json($response, ['error' => 'No se pudo consultar el servicio de datos.'], 502);
        }   
    }
    
    public function refresh(Request $request, Response $response, array $args) {
        $body = json_decode($request->getBody());
                 
        $datos = $this->verificarToken($args['id'], $body->tkRef);        
        
        $body = json_decode($datos['body']);
        $status = json_decode($datos['status']);
     
         if ($status === 200) {
            $tokens = $this->generarToken($args['id'], $body->rol);
            $this->modificarToken(cedula: $args['id'], tkRef: $tokens['tkRef']);

            $response->getBody()->write(json_encode($tokens));
        }
       return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }    
    private function json(Response $response, array $payload, int $status): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
        return $response->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($status);
    }
}