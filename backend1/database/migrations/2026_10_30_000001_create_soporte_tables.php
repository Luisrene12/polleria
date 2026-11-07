<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── TICKETS DE SOPORTE TÉCNICO ──────────────────────────────────────
        Schema::create('soporte_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('usuarios')->onDelete('cascade');
            $table->string('asunto', 200);
            $table->string('categoria', 50)->default('tecnico'); // tecnico, facturacion, pos, duda, otro
            $table->enum('prioridad', ['baja', 'media', 'alta', 'urgente'])->default('media');
            $table->enum('estado', ['abierto', 'en_proceso', 'esperando_respuesta', 'resuelto', 'cerrado'])->default('abierto');
            $table->foreignId('asignado_a')->nullable()->constrained('usuarios')->onDelete('set null');
            $table->timestamp('resuelto_en')->nullable();
            $table->timestamps();

            $table->index(['negocio_id', 'estado']);
            $table->index('prioridad');
        });

        // ─── MENSAJES DEL TICKET ─────────────────────────────────────────────
        Schema::create('soporte_mensajes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('soporte_tickets')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('usuarios')->onDelete('cascade');
            $table->boolean('es_superadmin')->default(false);
            $table->text('mensaje');
            $table->string('adjunto_url', 255)->nullable();
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('soporte_mensajes');
        Schema::dropIfExists('soporte_tickets');
    }
};
