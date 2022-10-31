<script setup>
	import Footer  from '../components/Footer.vue';
    import Header from '../components/Header.vue';
</script>

<template>
	<div class="content">
		<Header 
            :hasBack="true"
            :hasMenu="true"/>
		<main id="home">
			<img class="title" alt="Algo Particular" src="../assets/Logo_mana.svg">

			<section class="intro">
				<h3>{{ $t("message.notFound") }}</h3>
				<p>{{ $t("message.notFoundCopy") }}</p>
				<!-- <p>{{ $t("message.notFoundButton") }}</p> -->
			</section>
		</main> 
		<Footer />
	</div>
</template>

<style scoped>
	main#home {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		padding-top: 80px;
	}

	#home .title {
		width: 50vw;
		max-width: 300px;
	}

	section {
		padding: 100px 0;
		width: 90vh;
		max-width: 360px;		
	}

	section p {
		text-align: justify;
	}
</style>