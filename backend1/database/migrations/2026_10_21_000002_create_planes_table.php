<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            $table->decimal('precio', 10, 2)->default(0);
            $table->string('moneda', 10)->default('BOB');
            $table->enum('frecuencia', ['mensual', 'anual'])->default('mensual');
            $table->integer('limite_usuarios')->default(5);
            $table->integer('limite_sucursales')->default(1);
            $table->boolean('activo')->default(true);
            $table->integer('orden')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes');
    }
};
