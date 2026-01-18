# JSON de soporte para seed.ts

Coloca aquí los archivos `.json` que utiliza `data/seed/seed.ts` para poblar catálogos base (usuarios, temporadas, formatos, etc.).

- El script busca archivos con nombres como `users.json`, `seasons.json`, etc.
- Mantén valores determinísticos (UUIDs, códigos) cuando quieras que el snapshot SQL sea estable entre ejecuciones.
- Recuerda actualizar este directorio junto al snapshot `generated/seed-data.sql` cuando cambies datos.
