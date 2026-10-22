<?php
// Aplica los archivos app/sql/*.sql que falten (en orden) y lo anota en _migraciones. Lo usan el instalador y las pruebas.
declare(strict_types=1);

/** Parte un script SQL en sentencias respetando las comillas simples y los comentarios de línea «-- …». */
function sentenciasSql(string $sql): array {
    $out = [];
    $actual = '';
    $comilla = false;
    $n = strlen($sql);
    for ($i = 0; $i < $n; $i++) {
        $c = $sql[$i];
        if (!$comilla && $c === '-' && ($sql[$i + 1] ?? '') === '-') {
            while ($i < $n && $sql[$i] !== "\n") $i++;
            continue;
        }
        if ($c === "'") {
            if ($comilla && ($sql[$i + 1] ?? '') === "'") { $actual .= "''"; $i++; continue; }
            $comilla = !$comilla;
        }
        if ($c === ';' && !$comilla) {
            if (trim($actual) !== '') $out[] = trim($actual);
            $actual = '';
            continue;
        }
        $actual .= $c;
    }
    if (trim($actual) !== '') $out[] = trim($actual);
    return $out;
}

/** @return string[] nombres de los archivos aplicados ahora */
function migrar(string $dir = __DIR__ . '/../sql'): array {
    db()->exec('CREATE TABLE IF NOT EXISTS _migraciones (nombre VARCHAR(80) NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $hechas = array_column(filas('SELECT nombre FROM _migraciones'), 'nombre');
    $archivos = glob($dir . '/*.sql') ?: [];
    sort($archivos);
    $aplicadas = [];
    foreach ($archivos as $ruta) {
        $nombre = basename($ruta);
        if (in_array($nombre, $hechas, true)) continue;
        foreach (sentenciasSql((string) file_get_contents($ruta)) as $s) db()->exec($s);
        ejecutar('INSERT INTO _migraciones (nombre) VALUES (?)', [$nombre]);
        $aplicadas[] = $nombre;
    }
    return $aplicadas;
}
