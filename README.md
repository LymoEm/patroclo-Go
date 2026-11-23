# Patroclo Go

Abre `index.html` en Chrome o Edge. La página funciona con HTML, CSS y JavaScript y carga el mapa 3D desde los archivos del proyecto.

- **Estudiante.** Mapa de la sede Calle 100, fichas de grupos y búsqueda por palabras clave.
- **Administración.** Edición de fichas y restauración de versiones anteriores.
- **Contenido.** El catálogo inicial está en `public/catalog.js`. Los horarios y contenidos institucionales están pendientes de validación. El sótano requiere un plano.

Al abrir el archivo directamente, la sesión y los cambios se guardan en ese navegador. Para usar sesiones y almacenamiento en el servidor, ejecuta `node server.js` y abre [Patroclo Go](http://localhost:3000/). El servidor guarda los cambios en `data/content.json`.

El mapa usa la fotografía aérea como referencia para los volúmenes exteriores y sigue el enfoque de vincular anotaciones al mapa 3D del [artículo de Julio Santarelli](https://medium.com/@JulioSantarelli/creando-un-mapa-interactivo-con-three-js-y-firestore-desde-cero-9978b5c92c0f).
