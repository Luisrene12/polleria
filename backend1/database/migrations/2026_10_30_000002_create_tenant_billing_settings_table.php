<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_billing_settings', function (Blueprint $table) {
            $table->id();

            // Referencia al negocio / tenant
            $table->foreignId('negocio_id')
                  ->unique()
                  ->constrained('negocios')
                  ->onDelete('cascade');

            // ─── MODALIDAD DE COMPROBANTES ────────────────────────────────────
            // solo_nota_venta | solo_factura_electronica | ambos
            $table->enum('billing_mode', [
                'solo_nota_venta',
                'solo_factura_electronica',
                'ambos',
            ])->default('solo_nota_venta');

            $table->boolean('receipt_enabled')->default(true);
            $table->boolean('electronic_invoice_enabled')->default(false);

            // ─── INTEGRACIÓN TRIBUTARIA (SIN Bolivia) ─────────────────────────
            // pendiente | configurando | activa | error | suspendida
            $table->enum('tax_integration_status', [
                'pendiente',
                'configurando',
                'activa',
                'error',
                'suspendida',
            ])->default('pendiente');

            // NIT del contribuyente (visible, no sensible)
            $table->string('nit', 20)->nullable();

            // Razón social tributaria
            $table->string('razon_social_tributaria', 200)->nullable();

            // Modalidad de facturación SIN: computarizada | manual | electrónica
            $table->string('modalidad_facturacion', 50)->nullable();

            // Código de sistema asignado por el SIN
            $table->string('codigo_sistema', 50)->nullable();

            // Punto de venta (sucursal) asignado por el SIN
            $table->string('punto_venta', 10)->nullable();

            // Credenciales y parámetros del SIN — cifrados AES-256 en BD
            // Nunca exponer al frontend ni al Super Admin en texto plano
            $table->text('tax_credentials_encrypted')->nullable()
                  ->comment('JSON cifrado con AES-256-CBC: token_delegado, codigo_ambito, etc.');

            // Configuración adicional del SIN (no sensible)
            $table->json('tax_configuration')->nullable()
                  ->comment('Parámetros no sensibles: codigo_actividad, codigo_documento, tipo_emision, etc.');

            // ─── CONTROL Y TRAZABILIDAD ───────────────────────────────────────
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('last_modified_at')->nullable()->useCurrentOnUpdate();

            // Quién realizó el último cambio
            $table->foreignId('modified_by')
                  ->nullable()
                  ->constrained('usuarios')
                  ->onDelete('set null');

            $table->text('observaciones')->nullable();

            $table->timestamps();

            $table->index(['negocio_id', 'billing_mode']);
            $table->index(['negocio_id', 'tax_integration_status']);
        });

        // ─── HISTORIAL DE CAMBIOS EN CONFIGURACIÓN DE FACTURACIÓN ────────────
        Schema::create('billing_config_history', function (Blueprint $table) {
            $table->id();

            $table->foreignId('negocio_id')
                  ->constrained('negocios')
                  ->onDelete('cascade');

            $table->foreignId('modificado_por')
                  ->nullable()
                  ->constrained('usuarios')
                  ->onDelete('set null');

            // Snapshot del estado anterior (sin datos sensibles)
            $table->json('estado_anterior')->nullable();

            // Snapshot del nuevo estado (sin datos sensibles)
            $table->json('estado_nuevo')->nullable();

            $table->string('campo_modificado', 100)->nullable();
            $table->text('motivo')->nullable();
            $table->string('ip', 45)->nullable();

            $table->timestamp('creado_en')->useCurrent();

            $table->index(['negocio_id', 'creado_en']);
        });

        // ─── REGISTRO DE COMPROBANTES EMITIDOS ───────────────────────────────
        Schema::create('comprobantes_emitidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('negocio_id')
                  ->constrained('negocios')
                  ->onDelete('cascade');

            $table->foreignId('venta_id')
                  ->nullable()
                  ->constrained('ventas')
                  ->onDelete('set null');

            $table->foreignId('emitido_por')
                  ->nullable()
                  ->constrained('usuarios')
                  ->onDelete('set null');

            // nota_venta | factura_electronica
            $table->enum('tipo_comprobante', ['nota_venta', 'factura_electronica'])
                  ->default('nota_venta');

            // Número de comprobante / Número de factura SIN
            $table->string('numero_comprobante', 50)->nullable();

            // Código de Control SIN (solo facturas electrónicas)
            $table->string('codigo_control', 100)->nullable();

            // CUFD / CUIS del SIN (solo facturas electrónicas)
            $table->string('cufd', 100)->nullable();

            // NIT / CI del cliente para la factura
            $table->string('nit_cliente', 20)->nullable();
            $table->string('nombre_cliente', 200)->nullable();

            $table->decimal('monto', 12, 2)->default(0);

            // pendiente | emitido | anulado | error
            $table->enum('estado', ['pendiente', 'emitido', 'anulado', 'error'])
                  ->default('pendiente');

            // Respuesta completa del SIN (solo facturas electrónicas)
            $table->json('respuesta_sin')->nullable();

            // Número de reintentos si hubo error en emisión
            $table->tinyInteger('reintentos')->default(0);

            $table->text('mensaje_error')->nullable();

            $table->timestamp('emitido_en')->useCurrent();
            $table->timestamp('anulado_en')->nullable();

            $table->foreignId('anulado_por')
                  ->nullable()
                  ->constrained('usuarios')
                  ->onDelete('set null');

            $table->text('motivo_anulacion')->nullable();

            $table->timestamps();

            $table->index(['negocio_id', 'tipo_comprobante', 'estado']);
            $table->index(['negocio_id', 'emitido_en']);
            $table->index('numero_comprobante');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprobantes_emitidos');
        Schema::dropIfExists('billing_config_history');
        Schema::dropIfExists('tenant_billing_settings');
    }
};
