<?php
// GET /fotos/<id> · foto subida desde el admin (php/index.php deja el id en $_GET['id']). Equivale a src/server/fotos.ts.
// La URL lleva ?v=… y cambia con cada subida, así que se puede cachear para siempre.
declare(strict_types=1);

$f = foto((int) ($_GET['id'] ?? 0));
if (!$f) texto('Foto no encontrada', 404);

header('Content-Type: ' . $f['tipo']);
header('Cache-Control: public, max-age=31536000, immutable');
header('X-Content-Type-Options: nosniff');
header('Content-Length: ' . strlen($f['datos']));
echo $f['datos'];
