<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── SUSCRIPCIONES ────────────────────────────────────────────────────────
        Schema::create('suscripciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios')->onDelete('cascade');
            $table->foreignId('plan_id')->constrained('planes')->onDelete('restrict');
            $table->timestamp('fecha_inicio');
            $table->timestamp('fecha_fin');
            $table->enum('estado', ['pendiente', 'activa', 'vencida', 'gracia', 'suspendida', 'cancelada'])->default('activa');
            $table->integer('dias_gracia')->default(5);
            $table->timestamp('fecha_cancelacion')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['negocio_id', 'estado']);
        });

        // ─── PAGOS DE SUSCRIPCIÓN ────────────────────────────────────────────────
        Schema::create('pagos_suscripcion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('suscripcion_id')->constrained('suscripciones')->onDelete('cascade');
            $table->foreignId('negocio_id')->constrained('negocios')->onDelete('cascade');
            $table->decimal('monto', 10, 2);
            $table->string('moneda', 10)->default('BOB');
            $table->string('metodo_pago', 50)->default('qr'); // qr, transferencia, efectivo, otro
            $table->string('referencia', 100)->nullable();
            $table->enum('estado', ['pendiente', 'verificado', 'rechazado'])->default('pendiente');
            $table->string('comprobante_url', 255)->nullable();
            $table->foreignId('verificado_por')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamp('fecha_pago')->useCurrent();
            $table->timestamp('fecha_verificacion')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamp('creado_en')->useCurrent();

            $table->index(['negocio_id', 'estado']);
        });

        // ─── FUNCIONALIDADES DEL SISTEMA (MÓDULOS) ──────────────────────────────
        Schema::create('funcionalidades', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->unique();
            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            $table->string('modulo', 50)->default('general');
            $table->boolean('activo')->default(true);
        });

        // ─── PIVOT PLAN - FUNCIONALIDAD ──────────────────────────────────────────
        Schema::create('plan_funcionalidad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('planes')->onDelete('cascade');
            $table->foreignId('funcionalidad_id')->constrained('funcionalidades')->onDelete('cascade');
            $table->unique(['plan_id', 'funcionalidad_id']);
        });

        // ─── OVERRIDE FUNCIONALIDAD POR NEGOCIO ──────────────────────────────────
        Schema::create('negocio_funcionalidad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios')->onDelete('cascade');
            $table->foreignId('funcionalidad_id')->constrained('funcionalidades')->onDelete('cascade');
            $table->boolean('habilitado')->default(true);
            $table->json('configuracion')->nullable();
            $table->unique(['negocio_id', 'funcionalidad_id']);
        });

        // ─── DOMINIOS / SUBDOMINIOS ──────────────────────────────────────────────
        Schema::create('dominios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios')->onDelete('cascade');
            $table->string('subdominio', 63)->unique();
            $table->string('dominio_personalizado', 255)->nullable();
            $table->boolean('principal')->default(true);
            $table->boolean('activo')->default(true);
            $table->timestamp('creado_en')->useCurrent();
        });

        // ─── AUDITORÍA GLOBAL / NEGOCIO ─────────────────────────────────────────
        Schema::create('auditoria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->foreignId('negocio_id')->nullable()->constrained('negocios')->onDelete('cascade');
            $table->string('accion', 50);
            $table->string('recurso', 100);
            $table->unsignedBigInteger('recurso_id')->nullable();
            $table->json('datos_anteriores')->nullable();
            $table->json('datos_nuevos')->nullable();
            $table->string('ip', 45)->nullable();
            $table->text('motivo')->nullable();
            $table->timestamp('creado_en')->useCurrent();

            $table->index(['negocio_id', 'accion']);
            $table->index('creado_en');
        });

        // ─── NOTIFICACIONES ──────────────────────────────────────────────────────
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->onDelete('cascade');
            $table->foreignId('negocio_id')->nullable()->constrained('negocios')->onDelete('cascade');
            $table->string('tipo', 50);
            $table->string('titulo', 200);
            $table->text('mensaje');
            $table->json('datos')->nullable();
            $table->boolean('leida')->default(false);
            $table->timestamp('creado_en')->useCurrent();

            $table->index(['usuario_id', 'leida']);
            $table->index(['negocio_id', 'tipo']);
        });

        // ─── CONFIGURACIONES POR NEGOCIO ─────────────────────────────────────────
        Schema::create('configuraciones_negocio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios')->onDelete('cascade');
            $table->string('clave', 100);
            $table->text('valor')->nullable();
            $table->timestamp('actualizado_en')->nullable()->useCurrentOnUpdate();

            $table->unique(['negocio_id', 'clave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuraciones_negocio');
        Schema::dropIfExists('notificaciones');
        Schema::dropIfExists('auditoria');
        Schema::dropIfExists('dominios');
        Schema::dropIfExists('negocio_funcionalidad');
        Schema::dropIfExists('plan_funcionalidad');
        Schema::dropIfExists('funcionalidades');
        Schema::dropIfExists('pagos_suscripcion');
        Schema::dropIfExists('suscripciones');
    }
};
