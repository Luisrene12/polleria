<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaasConfiguracion extends Model
{
    use HasFactory;

    protected $table = 'saas_configuracion';

    protected $fillable = [
        'clave',
        'valor',
        'tipo',
        'descripcion',
    ];

    /**
     * Obtener valor de configuración por clave con valor por defecto
     */
    public static function get(string $clave, $default = null)
    {
        $item = static::where('clave', $clave)->first();
        if (!$item) return $default;

        return match ($item->tipo) {
            'boolean' => filter_var($item->valor, FILTER_VALIDATE_BOOLEAN),
            'number', 'integer' => (int) $item->valor,
            'json' => json_decode($item->valor, true),
            default => $item->valor,
        };
    }

    /**
     * Establecer o actualizar una configuración
     */
    public static function set(string $clave, $valor, string $tipo = 'string', ?string $descripcion = null): self
    {
        $valorString = is_array($valor) ? json_encode($valor) : (string) $valor;
        return static::updateOrCreate(
            ['clave' => $clave],
            [
                'valor' => $valorString,
                'tipo' => $tipo,
                'descripcion' => $descripcion ?? $clave,
            ]
        );
    }
}
