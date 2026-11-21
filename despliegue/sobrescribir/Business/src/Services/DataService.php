<?php
namespace App\Services;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Client;
use Psr\Http\Message\ResponseInterface;

/**
 * Cliente HTTP hacia la capa de DATOS.
 *
 * Cambio para despliegue: si existe INTERNAL_KEY en el .env, se envía en la
 * cabecera X-Internal-Key. La capa de datos (cuando también tiene INTERNAL_KEY)
 * rechaza con 403 cualquier petición que no la traiga, de modo que aunque el
 * hosting obligue a que la capa de datos tenga URL pública, solo la capa de
 * negocio puede consumirla. Sin INTERNAL_KEY se comporta igual que antes.
 */
final class DataService {
    private ClientInterface $client;
    public function __construct(object $config) {
        $headers = ['Accept' => 'application/json'];
        $internalKey = $_ENV['INTERNAL_KEY'] ?? '';
        if ($internalKey !== '') {
            $headers['X-Internal-Key'] = $internalKey;
        }

        $this->client = new Client([
            'base_uri' => rtrim($config->api_data, '/') . '/',
            'timeout' => $config->timeout,
            'connect_timeout' => $config->timeout,
            'http_errors' => false,
            'headers' => $headers
        ]);
    }
    public function get(string $path, array $query = []): ResponseInterface {
        return $this->client->request('GET', ltrim($path, '/'),
            ['query' => $query]);
    }
    public function post(string $path, string $body): ResponseInterface {
        return $this->client->request('POST', ltrim($path, '/'),
            ['body' => $body,
             'headers' => ['Content-Type' => 'application/json']
             ]);
    }
    public function put(string $path, string $body): ResponseInterface {
        return $this->client->request('PUT', ltrim($path, '/'),
            ['body' => $body,
             'headers' => ['Content-Type' => 'application/json']
             ]);
    }
    public function delete(string $path): ResponseInterface {
        return $this->client->request('DELETE', ltrim($path, '/'));
    }
}
