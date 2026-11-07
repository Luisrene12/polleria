<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            DB::table('ventas_detalle')->truncate();
            DB::table('ventas')->truncate();
            DB::table('cierres_caja')->truncate();
            DB::table('productos')->truncate();
            DB::table('categorias')->truncate();
            DB::table('reporte')->truncate();
            DB::table('usuarios')->truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }

        // 1. USUARIOS
        Schema::table('usuarios', function (Blueprint $table) {
            $table->foreignId('negocio_id')->nullable()->after('id')->constrained('negocios')->onDelete('cascade');
            $table->dropUnique('usuarios_username_unique');
            $table->index(['negocio_id', 'username'], 'usuarios_negocio_username_idx');
        });

        // 2. CATEGORÍAS
        Schema::table('categorias', function (Blueprint $table) {
            $table->foreignId('negocio_id')->after('id')->constrained('negocios')->onDelete('cascade');
            $table->index('negocio_id');
        });

        // 3. PRODUCTOS
        Schema::table('productos', function (Blueprint $table) {
            $table->foreignId('negocio_id')->after('id')->constrained('negocios')->onDelete('cascade');
            $table->dropUnique('productos_codigo_unique');
            $table->unique(['negocio_id', 'codigo'], 'productos_negocio_codigo_unique');
        });

        // 4. VENTAS
        Schema::table('ventas', function (Blueprint $table) {
            $table->foreignId('negocio_id')->after('id')->constrained('negocios')->onDelete('cascade');
            $table->index('negocio_id');
        });

        // 5. CIERRES CAJA
        Schema::table('cierres_caja', function (Blueprint $table) {
            $table->foreignId('negocio_id')->after('id')->constrained('negocios')->onDelete('cascade');
            $table->index('negocio_id');
        });

        // 6. REPORTE
        Schema::table('reporte', function (Blueprint $table) {
            $table->foreignId('negocio_id')->after('id')->constrained('negocios')->onDelete('cascade');
            $table->index('negocio_id');
        });
    }

    public function down(): void
    {
        Schema::table('reporte', function (Blueprint $table) {
            $table->dropForeign(['negocio_id']);
            $table->dropColumn('negocio_id');
        });

        Schema::table('cierres_caja', function (Blueprint $table) {
            $table->dropForeign(['negocio_id']);
            $table->dropColumn('negocio_id');
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->dropForeign(['negocio_id']);
            $table->dropColumn('negocio_id');
        });

        Schema::table('productos', function (Blueprint $table) {
            $table->dropUnique('productos_negocio_codigo_unique');
            $table->dropForeign(['negocio_id']);
            $table->dropColumn('negocio_id');
            $table->unique('codigo');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->dropForeign(['negocio_id']);
            $table->dropColumn('negocio_id');
        });

        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropIndex('usuarios_negocio_username_idx');
            $table->dropForeign(['negocio_id']);
            $table->dropColumn('negocio_id');
            $table->unique('username');
        });
    }
};
