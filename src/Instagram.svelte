<script>
	import { onMount } from "svelte";

	// Usuario de instragam, por ejemplo, https://www.instagram.com/alextomas/ > alextomas
	export let username = null;

	// Título del carrusel de imágenes
	export let title = `Últimas imágenes de ${username}`;

	// Mostrar/ocultal el título
	export let showTitle = true;

	// Cantidad de imágenes a mostrar
	export let q = 10;

	// Tamaño de cada imagen
	export let size = 150;

	// Espacio entre cada imagen
	export let spacing = 1;

	// Scroll horizontal para el carrusel
	export let horizontalScroll = true;

	let images = [];

	const INSTAGRAM_REGEXP = new RegExp(
		/<script type="text\/javascript">window\._sharedData = (.*);<\/script>/
	);

	const getPhotosFromInstagram = async () => {
		let limitImages;
		limitImages = q > 12 || q < 1 ? 12 : q;

		const response = await fetch(`https://www.instagram.com/${username}/`);
		const text = await response.text();
		const json = JSON.parse(text.match(INSTAGRAM_REGEXP)[1]);
		const edges = json.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges.splice(
			0,
			limitImages
		);
		return edges.map(({ node }) => ({
			permalink: `https://www.instagram.com/p/${node.shortcode}/`,
			media_url: node.thumbnail_src,
		}));
	};

	onMount(async () => {
		if (username) {
			images = await getPhotosFromInstagram();
		} else {
		}
	});
</script>

<div class="c-instagram">
	{#if showTitle}
		<div class="c-instagram__title">{title}</div>
	{/if}
	{#if username && images.length && images.length > 0}
		<div
			class="c-instagram__carousel {horizontalScroll
				? 'c-instagram__scroll'
				: 'c-instagram__no-scroll'}"
		>
			{#each images as { permalink, media_url }}
				<a class="c-instagram__link" href={permalink} target="_blank">
					<div
						class="c-instagram__carousel-item "
						style="background-image: url('{media_url}'); width: {size}px; height: {size}px; margin-right: {spacing}px"
					/>
				</a>
			{/each}
		</div>
	{:else if username && images.length && images.length < 1}
		<div class="c-instagram__alert">
			<p>No se han obtenido imágenes</p>
		</div>
	{:else if !username}
		<div class="c-instagram__alert">
			<p><b>ERROR</b></p>
			<p>
				El <b>nombre de usuario</b> es requerido. Recuerda que el nombre
				de usuario es:
			</p>
			<ul>
				<li>https://www.instagram.com/<i>NOMBRE_DE_USUARIO</i></li>
			</ul>
		</div>
	{/if}
</div>

<style>
	/* .c-instagram {
		width: 100%;
	}
	.c-instagram__link {
		overflow: hidden;
		display: contents;
	}
	.c-instagram__link:hover .c-instagram__carousel-item {
		transform: scale(1.05);
	}

	.c-instagram__title {
		border-bottom: 1px solid rgb(230, 230, 230);
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 10px;
		padding-bottom: 10px;
		text-align: left;
	}
	.c-instagram__carousel {
		display: flex;
	}
	.c-instagram__scroll {
		overflow-x: auto;
	}
	.c-instagram__no-scroll {
		flex-flow: row wrap;
	}
	.c-instagram__carousel-item {
		background-position: center center;
		background-size: cover;
		flex: 0 0 auto;
		transition: ease 0.3s;
	}
	.c-instagram__alert {
		padding: 20px;
		text-align: left;
		background-color: rgb(255, 252, 211);
	}
	.c-instagram__alert i {
		background-color: rgb(184, 255, 184);
		padding: 2px 5px;
	} */
</style>
