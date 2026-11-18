<?php

declare(strict_types=1);

namespace App\controllers;

use Illuminate\Database\QueryException;
use App\Models\CitasModel;
use Psr\Container\ContainerInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class Citas
{
    

    public function __construct(private ContainerInterface $container)   {  }

    public function create(Request $request, Response $response, array $args): Response
    {
        $eloquent = $this->container->get('eloquent');
        $data = $request->getParsedBody();
        $data = is_array($data) ? $data : [];

        $patientId = $data['paciente_id'] ?? null;
        $doctorId = $data['medico_id'] ?? null;
        $dateTime = trim((string) ($data['fecha_hora'] ?? ''));
        $reason = isset($data['motivo']) ? trim((string) $data['motivo']) : null;
        if ($reason !== null && $reason === '') {
            $reason = null;
        }

        try {
            $eloquent->connection()->statement(
                'CALL sp_crear_cita(?, ?, ?, ?, @resultado)',
                [$patientId, $doctorId, $dateTime, $reason]
            );
            $result = $eloquent->connection()->selectOne('SELECT @resultado AS resultado');
            $message = (string) ($result->resultado ?? '');
        } catch (QueryException $exception) {
            return $this->json($response, [
                'error' => 'No fue posible agendar la cita. Verifique que el paciente y el médico existan.',
            ], 422);
        }

        if (str_starts_with($message, 'Error:')) {
            return $this->json($response, ['error' => $message], 409);
        }

        return $this->json($response, ['message' => $message], 201);
    }

    public function readPaciente(Request $request, Response $response, array $args): Response
    {
        $patientId = $args['id'] ?? $request->getQueryParams()['paciente_id'] ?? null;

        $eloquent = $this->container->get('eloquent');
        $citas = $eloquent->connection()->select(
            'CALL sp_obtener_citas_paciente(?)',
            [$patientId]
        );
        $status = sizeOf($citas) > 0 ? 200 : 404;
        return $this->json($response, ['data' => $citas], $status);
    }
    public function readMedico(Request $request, Response $response, array $args): Response
    {
        $doctorId = $args['id'] ?? $request->getQueryParams()['medico_id'] ?? null;

        $eloquent = $this->container->get('eloquent');
        $citas = $eloquent->connection()->select(
            'CALL sp_obtener_citas_medico(?)',
            [$doctorId]
        );
        $status = sizeOf($citas) > 0 ? 200 : 404;
        return $this->json($response, ['data' => $citas], $status);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $eloquent = $this->container->get('eloquent');
        $cita = CitasModel::find($args['id'] ?? null);
        if ($cita === null) {
            return $this->json($response, ['error' => 'Cita no encontrada.'], 404);
        }

        $data = $request->getParsedBody();
        $data = is_array($data) ? $data : [];
        $changes = array_intersect_key($data, array_flip(['paciente_id', 'medico_id', 'fecha_hora', 'motivo']));

        $updatedDoctorId = $changes['medico_id'] ?? $cita->medico_id;
        $updatedDateTime = $changes['fecha_hora'] ?? $cita->fecha_hora;
        if (
            $cita->estado === 'Programada'
            && CitasModel::query()
                ->where('medico_id', $updatedDoctorId)
                ->where('fecha_hora', $updatedDateTime)
                ->where('estado', 'Programada')
                ->where('id', '<>', $cita->id)
                ->exists()
        ) {
            return $this->json($response, ['error' => 'El médico ya tiene una cita programada en ese horario.'], 409);
        }

        try {
            $cita->fill($changes);
            $cita->save();
        } catch (QueryException $exception) {
            return $this->json($response, [
                'error' => 'No fue posible actualizar la cita. Verifique que el paciente y el médico existan.',
            ], 422);
        }

        return $this->json($response, ['data' => $cita->toArray()], 200);
    }


    private function json(Response $response, array $payload, int $status): Response
    {
        $response->getBody()->write(json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        ));

        return $response
            ->withHeader('Content-Type', 'application/json; charset=utf-8')
            ->withStatus($status);
    }
}