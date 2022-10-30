<script setup>
	import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { animate, scroll } from "motion";

    import Header  from '../components/Header.vue';
    import Footer  from '../components/Footer.vue';

    import { KinesisContainer, KinesisElement} from 'vue-kinesis';
    
    const router = useRouter();

    const gallery = ref([
        'url(/gallery/27.jpg)',
        'url(/gallery/4.jpg)',
        'url(/gallery/29.jpg)',
        'url(/gallery/3.jpg)',
        'url(/gallery/20.jpg)'
    ]);
    let currentIndex = 1;

    const galleryWrapper = document.getElementById('galleryWrapper');

    //handle navigation
    const handleNavigate = (url) => {
        router.push({ path: url }); //, replace: true
    };    


    // //ON MOUNTED
	onMounted (() => {           
        setInterval(function(){
            animate("#galleryWrapper", {
                backgroundImage: gallery.value[currentIndex]
            },
            {
                ease: "cubic-bezier(0.23, 1, 0.32, 1)"
            });

            if(currentIndex+1 == gallery.value.length ) {
                currentIndex = 0;
            } else {
                currentIndex++;
            }
            // console.log(currentIndex);
        }, 5000);

        const colorSection = document.querySelectorAll("#uno")[0];

        const scrollOptions = {
            target: colorSection,
            offset: ["start end", "end end"]
        }

        // Pass an animation or timeline to automatically scrub
        scroll(
            animate("#uno", { backgroundColor: "#FF6F61" }),
            scrollOptions
        );
    });
</script>

<template>
	<div class="landing">
        <Header :hasMenu="true">
            <template v-slot:logo>
                <img alt="Algo Particular" src="../assets/SeedWhite.svg">
            </template>
        </Header>
       
        <kinesis-container id="hero" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100">
            <kinesis-element
                tag="h1">
                {{ $t("landing.intro") }}
            </kinesis-element>
            
            <kinesis-element 
                class="splash particle"
                :strength="30"
                axis="y"
                type="translate"/>
            <kinesis-element 
                class="splash cell one"
                :strength="20"   
                axis="x"
                transformOrigin="top left"
                type="translate"/>
            <kinesis-element 
                class="splash cell two"
                :strength="40"
                transformOrigin="bottom right"
                type="translate"/>
            <kinesis-element 
                class="splash cell three"
                :strength="10"
                transformOrigin="bottom left"
                type="translate"/>

            <div class="splash background"></div>            
        </kinesis-container>

        <kinesis-container id="oracle" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" event="scroll">
            <div class="copy">
                <div class="heading">
                    <img src="../assets/icon/Lab.svg"/>
                    <h3>{{ $t("landing.oracleTitle") }}</h3>
                </div>
                <p>{{ $t("landing.oracleDescrip") }}</p>
                <button @click="handleNavigate('/praxis')">{{ $t("landing.oracleAction") }}</button>
            </div>
        
            <kinesis-element 
                class="oracle particle"
                :strength="200"
                type="translate"/>
            <kinesis-element 
                class="oracle tree"
                :strength="100"
                type="translate"/>

            <div class="oracle stars"></div>
        </kinesis-container>

        <section id="about">
            <div id="galleryWrapper"></div>

            <div class="copy">
                <div class="heading">
                    <img src="../assets/icon/Brote.svg"/>
                    <h3>{{ $t("landing.aboutTitle") }}</h3>
                </div>
                <p>{{ $t("landing.aboutDescrip") }}</p>
                <button @click="handleNavigate('/collaborate')">{{ $t("landing.aboutAction") }}</button>
            </div>
        </section>

        <section id="uno">
            <h2>{{ $t("landing.uno") }}</h2>
        </section>

        <Footer />
	</div>
</template>

<style scoped>
    section {
        height: 100vh;
        width: 100vw;
        position: relative;
    }

    /* HERO */
	#hero {
        background-color: #6A428D;
        height: 90vh;
        padding: 5vh 0;
        box-shadow: inset 0px 6px 63px rgb(255 111 97 / 36%), inset 0px -6px 64px rgb(20 50 70 / 90%);
    }

    h1 {
        color: #F7F8F1;
        position: absolute;
        z-index: 10;
        top: 23vh;
        left: 7vw; 
        
        text-align: center;
        width: 86vw;        
        font-size: 36px;
        letter-spacing: 2px;
        line-height: 120%;
    }

    .splash, .oracle {        
        position: absolute;
        z-index: 3;
        
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;        
    }

    .splash.particle {
        background-image: url('../assets/hero/particle.png');        
        z-index: 9;
        height: 40vh;
        width: 80vw;

        top: 36vh;
        left: 10vw;
    }

    .splash.cell.one {
        background-image: url('../assets/hero/cell-one.png');
        height: 27vh;
        width: 27vw;

        top: 69vh;
        right: 9vw;            
    }

    .splash.cell.two {
        background-image: url('../assets/hero/cell-two.png');
        height: 23vh;
        width: 23vw;

        top: 7vh;
        right: 18vw;
    }
    .splash.cell.three {
        background-image: url('../assets/hero/cell-three.png');            
        height: 27vh;
        width: 27vw;

        top: 78vh;
        left: 9vw;
    }    

    .splash.background {
        background-image: url('../assets/hero/background.png');
        background-size: cover;        
        
        top: 0;
        z-index: 0;
        width: 100vw;
        height: 100%;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        h1 {
            top: 50vh;
            left: 42vw; 
            
            width: 36vw;        
            font-size: 40px;
            letter-spacing: 3px;
            line-height: 130%;
        }

        .splash.particle {
            height: 70vh;
            width: 36vw;

            top: 20vh;
            left: 11vw;
        }

        .splash.cell.one {
            height: 30vh;
            width: 13vw;

            top: 63vh;
            right: 9vw;
        }

        .splash.cell.two {
            height: 22vh;
            width: 12vw;

            top: 13vh;
            left: auto;
            right: 20vw;
        }

        .splash.cell.three {
            height: 18vh;
            width: 15vw;

            top: 73vh;
            left: 3vw;
        }
    }
</style>

<style scoped>
    /* ORACLE */
    #oracle {
        background-color: #0381BA;   
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100vw;
    }

    .copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 40px;        
    }

    #oracle .copy {
        position: absolute;
        top: 10vh;
        left: 5vw;
        width: 90vw;
        z-index: 9;
    }

    .copy .heading {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 16px;
    }

    .copy .heading img {
        width: 48px;
        height: 48px;
        filter: drop-shadow(0px 2px 3px #C7BE8E);        
    }

    .copy .heading h3 {
        color: #F7F8F1;
        font-size: 32px;
        text-align: center;
    }

    .copy p {
        color: #F7F8F1;
        font-size: 18px;
        line-height: 150%;
        text-align: center;
        max-width: 310px;
    }

    .copy button {
        color: #0381BA;
        min-width: 310px;
    }

    .copy button:hover {
        /* color: #F7F8F1; */
        background-color: #E8E974;
    }

    .oracle.particle {
        background-image: url('../assets/oracle/particle.png');   
        z-index: 9;             
        height: 24vh;
        width: 80vw;

        top: 66vh;
        left: 10vw;        
    }

    .oracle.tree {
        background-image: url('../assets/oracle/tree.png');     
        z-index: 7;           
        height: 20vh;
        width: 20vw;

        top: 63vh;
        right: 18vw;        
    }

    .oracle.stars {
        background-image: url('../assets/oracle/stars.png');
        background-size: contain;
        background-repeat: repeat;
        
        top: 0;
        z-index: 3;
        width: 100vw;
        height: 100%;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #oracle {
            flex-direction: row;
        }

        #oracle {
            justify-content: flex-start;
        }

        #oracle .copy {
            top: 20vh;
            left: 15vw;
            width: auto;
        }

        .oracle.particle {            
            height: 50vh;
            width: 50vw;

            top: 20vh;
            left: auto;
            right: 6vw;        
        }

        .oracle.tree {         
            height: 20vh;
            width: 20vw;

            top: 23vh;
            right: 8vw;        
        }

        .oracle.stars {
            
        }
    }
</style>

<style scoped>
    /* ABOUT */
    #about {
        background-color: #F7F8F1;
        display: flex;
        align-items: center;
        flex-direction: column;      
        height: 120vh;      
    }

    #galleryWrapper {        
        width: 100vw;
        height: 100vh;
        background-color: #A4DAD9;   
        background-size: cover; 
        background-position: center;
        box-shadow: inset 0px -6px 81px rgba(255, 111, 97, 0.36), inset 0px 6px 81px rgba(20, 50, 70, 0.23);    

        background-image: url('/gallery/27.jpg'); /*default*/
    }    

    #about .copy {        
        width: 100vw;
        height: 100%;
        background-color: #F7F8F1;
        z-index: 1;
        padding: 5vh 0 15vh;        
    }

    #about .copy .heading img {
        filter: drop-shadow(0px 2px 3px rgba(255, 111, 97, 0.56));
    }

    #about .copy .heading h3 {
        color: #143246;
    }

    #about .copy p {
        color: #143246;
    }

    #about .copy button {
        color: #F7F8F1;
        background-color: #FF6F61;
    }

    #about .copy button:hover {
        color: #143246;
        background-color: #E8E974;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #about {
            flex-direction: row;
            height: auto;
        }

        #galleryWrapper {
            width: 50vw;            
        }

        #about .copy {
            width: 50vw;
            padding: 0;
        }
    }
</style>

<style scoped>
    /* UNO */
    #uno {
        background-color: #F7F8F1;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 90vh;
    }

    #uno h2 {
        color: #F7F8F1;
        letter-spacing: 1px;
        margin: 0;
        padding: 0;
        white-space: pre-line;
        text-align: center;
        line-height: 130%;
        font-size: 32px;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #uno h2 {
            font-size: 48px;
            letter-spacing: 2px;
        }
    }
</style>