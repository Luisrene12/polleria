<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('negocios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_comercial', 150);
            $table->string('razon_social', 200)->nullable();
            $table->string('nit', 30)->nullable();
            $table->string('email', 150);
            $table->string('telefono', 20)->nullable();
            $table->string('direccion', 255)->nullable();
            $table->string('ciudad', 100)->nullable();
            $table->string('departamento', 100)->nullable();
            $table->string('rubro', 100)->default('polleria');
            $table->enum('estado', ['activo', 'suspendido', 'pendiente', 'cancelado'])->default('activo');
            $table->string('slug', 100)->unique();
            $table->string('logo_url', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('negocios');
    }
};
