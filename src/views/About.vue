<script setup>
    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { es } from "../json/copy_es.json";
    
    import Footer  from '../components/Footer.vue';
    import Header from '../components/Header.vue';

    import { animate, timeline, inView, scroll } from "motion";
    
    const router = useRouter();

    const navigate = (url) => {
        router.push({ path: url});
    };     

    onMounted (() => {
        const colorSection = document.getElementById("cta"); 
        
        const scrollOptions = {
            target: colorSection,
            offset: ["start end", "end end"]
        }

        inView(colorSection, () => {
            scroll(
                animate(".colorMe", { backgroundColor: "#FF6F61" }),
                scrollOptions
            )
        });
    });
</script>


<template>
    <div class="content info">
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
        <section id="hero">
            <!-- <img src="../../public/assets/mural.jpg"/> -->
        </section>
		<main id="about" class="colorMe">            
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
                    <button class="fake seed" @click="navigate('/oracle')">
                        
                    </button>
                    <p>{{ $t("about.seed") }}</p>
                </div>
            </section>            
            <section id="cta">
                <h4>{{ $t("about.sustent") }}</h4>
                <button @click="navigate('/collaborate')">{{ $t("about.cta") }}</button>
            </section>            
		</main> 
        <Footer />
	</div>
</template>

<style>
    .content.info {
        
    }

    .content.info main {
        width: 100vw;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .content.info main section {
        max-width: 420px;
    }

    .content.info p {
        line-height: 160%;
    }
</style>

<style scoped>
    .content {
        background-color: #143246;
        height: auto;
    }

    #hero {
        width: 100vw;
        height: 60vh;
        /* overflow: hidden; */
        /* display: flex;
        align-items: center;         */

        background-image: url("../../public/assets/mural.jpg");
        background-size: cover;
        background-position: center;
        box-shadow: inset 0px 6px 63px rgb(0 127 136 / 36%), inset 0px -6px 64px rgb(20 50 70 / 90%);
    }

    /* #hero img {
        width: 100%;
        height: fit-content;
    } */

    main {
        gap: 108px;
        padding: 63px 0 108px;
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
        padding: 0 40px;
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .faq .title {
        text-align: center;
    }

    .faq p {
        text-align: center;
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
        
        background-image: url('../assets/icon/active/Seed.svg');
        background-color: #F7F8F1;
        background-repeat: no-repeat;
        background-position: 50%;
        background-size: 50%;
    }

    .faq button.fake:hover {
        background-image: url('../assets/icon/Seed.svg');
        background-color: #143246;
    }

    .faq button.fake.brote  {
        background-image: url('../assets/icon/Brote.svg');
    }

    #cta {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 32px;
        padding: 48px 24px;
    }
    #cta h4 {
        text-align: center;
    }

    #cta button {
        min-width: 240px;
        color: #FF6F61;
    }

    #cta button:hover {
        color: #F7F8F1;
        background-color: #143246;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
       
    }
</style>