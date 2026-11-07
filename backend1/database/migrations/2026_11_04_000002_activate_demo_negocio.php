<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Asegura que el restaurante principal esté activo tras configuraciones o pruebas de suspensión.
     */
    public function up(): void
    {
        DB::table('negocios')
            ->where('slug', 'el-pollon')
            ->orWhere('id', 1)
            ->update(['estado' => 'activo']);
    }

    public function down(): void
    {
        // No revertir estado de activación
    }
};

