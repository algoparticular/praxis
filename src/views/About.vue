<script setup>
    	
    import { useRouter } from 'vue-router';
    import { es } from "../json/copy_es.json";
    
    import Footer  from '../components/Footer.vue';
    import Header from '../components/Header.vue';
    
    const router = useRouter();

    const navigate = (url) => {
        router.push({ path: url});
    };     
</script>


<template>
    <div class="content">
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
		<main id="about">
			<section class="intro">
				<p>{{ $t("about.intro") }}</p>
                <a href="https://samasama.studio" target="_blank"><img src="../assets/samasama.svg"></a>
			</section>  
            <section class="credits">
                <div>
                    <p>{{ $t("about.designedBy") }}</p>
                    <a class="by" :href="es.about.authorLink" target="_blank">{{ $t("about.author") }}</a>
                </div>
            </section>
            <section class="faq">
                <!-- <h4 class="title">{{ $t("about.praxis") }}</h4> -->
                <p>{{ $t("about.praxisDescrip") }}</p>
            </section>
            <section class="faq">
                <h4 class="title">{{ $t("about.oracle") }}</h4>
                <p>{{ $t("about.oracleDescrip") }}</p>
                <div>
                    <button class="fake seed"></button>
                    <p>{{ $t("about.seed") }}</p>
                </div>
            </section>            
            <section class="cta">
                <h4>{{ $t("about.sustent") }}</h4>
                <button @click="navigate('/collaborate')">{{ $t("about.cta") }}</button>
            </section>            
		</main> 
        <Footer />
	</div>
</template>


<style scoped>
    .content {
        background-color: #143246;
        height: auto;
    }

    main {
        gap: 108px;
        padding: 108px 0 108px;
    }

    .content button.back {   
        margin: 40px;     
        height: 40px;        
    }

    .intro p, .credits p {
        text-align: center;
    }

    .intro img {
        width: 220px;
        margin: 16px 40px 0;
    }

    .credits {
        display: flex;
        flex-direction: column;
        gap: 56px;
    }

    .credits div {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .credits p {
        margin-bottom: 0;
    }

    .credits .by {
        font-weight: 600;
        text-align: center;
    }

    .faq {
        padding: 40px;
        max-width: 420px;
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .faq .title {
        text-align: center;
    }

    .faq p {
        text-align: justify;
        white-space: pre-line;
    }

    .faq div {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .faq div p {        
        text-align: center;
    }

    .faq button.fake {
        border-radius: 100%;

        width: 60px;
        height: 60px;

        box-shadow: 0px 2px 6px rgba(16, 16, 15, 0.36); 
        
        background-image: url('../assets/icon/Seed.svg');
        background-color: #FF6F61;
        background-repeat: no-repeat;
        background-position: 50%;
        background-size: 50%;

    }

    .faq button.fake.brote  {
        background-image: url('../assets/icon/Brote.svg');
    }

    .cta {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 32px;
    }
    .cta h4 {
        text-align: center;
    }

    .cta button {
        min-width: 240px;
    }


    /* DESKTOP */
    @media screen and (min-width: 769px) {
       
    }
</style>