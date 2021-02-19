# Svelte Instagram - Carrusel de imágenes

Carrusel de imágenes para mostrar un feed de la última actividad de una cuenta de [Instagram](https://www.instagram.com/).

## Instalación

```bash
npm i svelte-instagram --save
```

## Uso
```bash
<script>
	import Instagram from "svelte-instagram";
</script>

<div>
	<Instagram
		horizontalScroll={true}
		q={10}
		showTitle={true}
		size={200}
		spacing={2}
		title="Mis últimas imágenes de Instagram"
		username="alextomas"
	/>
</div>
```

## Opciones de configuración

| prop | tipo | valor por defecto | comentarios |
|---|---|---|---|
| **username** (*requerido*) | String | "" | Usuario de instagram |
| horizontalScroll | Boolean | true  | Indica si el carrusel tendrá scroll horizontal o no |
| q | Integer | 10 | Cantidad de imágenes del carrusel |
| showTitle | Boolean | true | Mostrar/ocultar el título del carrusel |
| size | Integer | 150 | Tamaño de cada imagen (serán cuadradas siempre) |
| spacing | Integer | 1 | Espaciado entre imágenes |
| title | String | Últimas imágenes de *username* | Título del carrusel |

## Limitaciones

Cómo máximo se podrán mostrar las últimas 12 imágenes.