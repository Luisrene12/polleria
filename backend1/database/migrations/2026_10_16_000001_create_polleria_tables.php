<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── USUARIOS ────────────────────────────────────────────────────────────
        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('username', 50)->unique();
            $table->string('pin_hash', 255);
            $table->string('rol', 50)->default('seller');
            $table->tinyInteger('activo')->default(1);
            $table->timestamp('creado_en')->nullable()->useCurrent();
        });

        // ─── CATEGORÍAS ──────────────────────────────────────────────────────────
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('descripcion', 255)->nullable();
            $table->tinyInteger('activa')->default(1);
            $table->timestamp('creado_en')->nullable()->useCurrent();
        });

        // ─── PRODUCTOS ───────────────────────────────────────────────────────────
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->nullable()->unique();
            $table->string('nombre', 150);
            $table->string('descripcion', 255)->nullable();
            $table->decimal('precio_venta', 10, 2)->default(0);
            $table->decimal('descuento', 10, 2)->default(0);
            $table->decimal('costo', 10, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->integer('minStock')->default(0);
            $table->unsignedBigInteger('categoria_id')->nullable();
            $table->string('imagen', 255)->nullable();
            $table->tinyInteger('activo')->default(1);
            $table->timestamp('creado_en')->nullable()->useCurrent();

            $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('set null');
        });

        // ─── VENTAS ──────────────────────────────────────────────────────────────
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id');
            $table->timestamp('fecha')->nullable()->useCurrent();
            $table->decimal('total', 10, 2)->default(0);
            $table->string('cliente', 100)->nullable();
            $table->string('metodo_pago', 50)->default('efectivo');
            $table->decimal('monto_efectivo', 10, 2)->default(0);
            $table->decimal('monto_tarjeta', 10, 2)->default(0);

            $table->foreign('usuario_id')->references('id')->on('usuarios')->onDelete('cascade');
        });

        // ─── VENTAS DETALLE ──────────────────────────────────────────────────────
        Schema::create('ventas_detalle', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('venta_id');
            $table->unsignedBigInteger('producto_id');
            $table->integer('cantidad')->default(1);
            $table->decimal('precio_unitario', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);

            $table->foreign('venta_id')->references('id')->on('ventas')->onDelete('cascade');
            $table->foreign('producto_id')->references('id')->on('productos')->onDelete('cascade');
        });

        // ─── CIERRES CAJA ────────────────────────────────────────────────────────
        Schema::create('cierres_caja', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('usuario_id');
            $table->timestamp('fecha_apertura')->nullable()->useCurrent();
            $table->timestamp('fecha_cierre')->nullable();
            $table->decimal('monto_inicial', 10, 2)->default(0);
            $table->decimal('monto_final_calculado', 10, 2)->default(0);
            $table->decimal('monto_final_real', 10, 2)->default(0);
            $table->decimal('diferencia', 10, 2)->default(0);
            $table->enum('estado', ['abierto', 'cerrado'])->default('abierto');

            $table->foreign('usuario_id')->references('id')->on('usuarios')->onDelete('cascade');
        });

        // ─── REPORTE ─────────────────────────────────────────────────────────────
        Schema::create('reporte', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('descripcion', 255)->nullable();
            $table->json('datos')->nullable();
            $table->timestamp('creado_en')->nullable()->useCurrent();
            $table->timestamp('actualizado_en')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reporte');
        Schema::dropIfExists('cierres_caja');
        Schema::dropIfExists('ventas_detalle');
        Schema::dropIfExists('ventas');
        Schema::dropIfExists('productos');
        Schema::dropIfExists('categorias');
        Schema::dropIfExists('usuarios');
    }
};
