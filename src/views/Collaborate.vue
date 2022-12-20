<script setup>
    import Header from '../components/Header.vue';
    import Footer from '../components/Footer.vue';

    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { animate, timeline, inView, scroll } from "motion";
    import { KinesisContainer, KinesisElement} from 'vue-kinesis';

    
    const router = useRouter();

    const navigate = (url) => {
        router.push({ path: url });
    };

    onMounted (() => {
        // Color share section
        const shareSection = document.getElementById("share"); 
        
        const scrollShareOptions = {
            target: shareSection,
            offset: ["start end", "end end"]
        }

        inView(shareSection, () => {
            scroll(
                animate("#share", { backgroundColor: "#007475" }),
                scrollShareOptions
            )
        });

        // Color donate section
        const colorSection = document.getElementById("next"); 
        
        const scrollOptions = {
            target: colorSection,
            offset: ["start end", "end end"]
        }

        inView(colorSection, () => {
            scroll(
                animate("#donate", { backgroundColor: "#71838F" }),
                scrollOptions
            )
        });
    });
    
</script>


<template>
    <div class="content">        
        <Header :hasMenu="true">
            <template v-slot:logo>
                <img alt="Algo Particular" src="../assets/SeedWhite.svg" loading="lazy">
            </template>
        </Header>
		<main id="collaborate" class="colorMe">
			
            <kinesis-container id="hero" tag="section" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100">
                <kinesis-element
                    tag="h1"
                    :strength="10"   
                    axis="x"
                    type="translate">
                    {{ $t("collaborate.intro") }}
                </kinesis-element>
                                
                <kinesis-element 
                    class="gfx splash boat"
                    tag="img"
                    src="/assets/collaborate/boat.webp"
                    loading=”lazy”
                    :strength="20"   
                    axis="x"
                    type="translate"/>
                <kinesis-element 
                    class="gfx splash sun"
                    tag="img"
                    src="/assets/collaborate/sun.webp"
                    loading=”lazy”
                    :strength="10"
                    type="translate"/>
                <kinesis-element 
                    class="gfx splash mushrooms"
                    tag="img"
                    src="/assets/collaborate/mushrooms.webp"
                    loading=”lazy”
                    :strength="60"
                    axis="x"
                    type="translate"/>
                <kinesis-element 
                    class="gfx splash plants"
                    tag="img"
                    src="/assets/collaborate/plants.webp"
                    loading=”lazy”
                    :strength="40"
                    axis="x"
                    type="translate"/>
                <kinesis-element 
                    class="gfx splash particles"
                    tag="img"
                    src="/assets/collaborate/particles.webp"
                    loading=”lazy”
                    :strength="30"
                    axis="x"
                    type="translate"/>
            </kinesis-container>

            <section id="share">
                <div class="shareSection invert">
                    <kinesis-container class="col ilustration" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100" event="scroll">
                        <kinesis-element 
                            class="gfx share fire"
                            tag="img"
                            src="/assets/share/fire.webp"
                            loading=”lazy”
                            :strength="60"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx share particles"
                            tag="img"
                            src="/assets/share/particles.webp"
                            loading=”lazy”
                            :strength="30"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx share island"
                            tag="img"
                            src="/assets/share/island.webp"
                            loading=”lazy”
                            :strength="40"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx share yellow"
                            tag="img"
                            src="/assets/share/yellow.webp"
                            loading=”lazy”
                            :strength="20"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx share red"
                            tag="img"
                            src="/assets/share/red.webp"
                            loading=”lazy”
                            :strength="20"                            
                            type="translate"/>
                    </kinesis-container>

                    <div class="col">
                        <div class="copy">
                            <h2>{{ $t("collaborate.shareTitle") }}</h2>
                            <p>{{ $t("collaborate.shareDescrip") }}</p>
                            
                            <a href="https://instagram.com/algo.particular" target="_blank" class="button hasIcon">
                                <svg class="icon" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M20.009 15.0085C17.246 15.0085 15.0068 17.2496 15.0068 20.0133C15.0068 22.7771 17.246 25.0182 20.009 25.0182C22.772 25.0182 25.0124 22.7771 25.0124 20.0133C25.0124 17.2496 22.772 15.0085 20.009 15.0085ZM20.009 27.7225C15.7524 27.7225 12.3021 24.2711 12.3021 20.0133C12.3021 15.7556 15.7524 12.3042 20.009 12.3042C24.2656 12.3042 27.7159 15.7556 27.7159 20.0133C27.7159 24.2711 24.2656 27.7225 20.009 27.7225ZM26.5231 12.9995C26.3253 12.7032 26.2198 12.3548 26.22 11.9985C26.2204 11.5209 26.4103 11.0629 26.748 10.7253C27.0857 10.3876 27.5436 10.1978 28.021 10.1976H28.0218C28.378 10.1978 28.7262 10.3036 29.0223 10.5016C29.3184 10.6997 29.5491 10.9812 29.6853 11.3104C29.8215 11.6397 29.857 12.0019 29.7874 12.3514C29.7177 12.7008 29.5461 13.0218 29.2941 13.2736C29.0421 13.5255 28.7211 13.697 28.3717 13.7663C28.0223 13.8357 27.6602 13.7999 27.3311 13.6634C27.0021 13.5269 26.7209 13.2959 26.5231 12.9995ZM11.1581 31.7174C11.6867 31.9233 12.482 32.1672 13.9454 32.2338C15.527 32.3066 16.0009 32.3211 20.009 32.3211C24.0171 32.3211 24.4924 32.3066 26.0744 32.2338C27.5378 32.1673 28.3334 31.9235 28.8617 31.7174C29.5624 31.4445 30.0631 31.119 30.5881 30.5944C31.113 30.0697 31.4379 29.5696 31.7107 28.8687C31.9155 28.34 32.1604 27.5444 32.227 26.0806C32.2998 24.4968 32.3143 24.0227 32.3143 20.0135C32.3143 16.0042 32.2998 15.5301 32.227 13.9463C32.1605 12.4825 31.9168 11.6867 31.7107 11.1582C31.4379 10.4573 31.1137 9.95644 30.5881 9.43134C30.0624 8.90623 29.5624 8.58002 28.8617 8.30834C28.3318 8.10416 27.5378 7.85854 26.0744 7.79188C24.491 7.7203 24.0153 7.70456 20.009 7.70456C16.0027 7.70456 15.5274 7.71909 13.9454 7.79188C12.482 7.85842 11.6864 8.10224 11.1581 8.30834C10.4562 8.58002 9.95669 8.90551 9.43174 9.43134C8.90678 9.95716 8.58187 10.4573 8.30906 11.1582C8.10494 11.6883 7.85939 12.4825 7.79275 13.9463C7.72119 15.5301 7.70546 16.0042 7.70546 20.0135C7.70546 24.0227 7.71999 24.4981 7.79275 26.0806C7.85927 27.5444 8.10302 28.3402 8.30906 28.8687C8.58067 29.5696 8.90606 30.0693 9.43174 30.5944C9.95741 31.1195 10.4574 31.4445 11.1581 31.7174ZM10.178 5.78826C11.1315 5.41713 12.2233 5.16371 13.8211 5.09092C15.4222 5.01694 15.9342 5 20.0102 5C24.0862 5 24.5978 5.01814 26.1981 5.09092C27.7947 5.1625 28.8859 5.41713 29.8412 5.78826C30.8269 6.17152 31.6647 6.68438 32.4988 7.51996C33.3328 8.35554 33.8457 9.19232 34.23 10.1795C34.601 11.1332 34.8543 12.2253 34.9271 13.8236C34.9999 15.4244 35.0168 15.9362 35.0168 20.0133C35.0168 24.0905 34.9999 24.601 34.9271 26.203C34.8555 27.8013 34.601 28.8928 34.23 29.8472C33.8457 30.8343 33.3341 31.6724 32.4988 32.5067C31.6634 33.341 30.8269 33.8541 29.84 34.2384C28.8859 34.6095 27.7948 34.863 26.1969 34.9357C24.5966 35.0097 24.085 35.0267 20.009 35.0267C15.933 35.0267 15.4222 35.0085 13.8211 34.9357C12.2233 34.863 11.1333 34.6095 10.178 34.2384C9.19051 33.8541 8.35445 33.3406 7.51923 32.5067C6.68401 31.6728 6.17118 30.8343 5.78803 29.8472C5.41701 28.8928 5.16366 27.8014 5.09089 26.203C5.01693 24.6022 5 24.0905 5 20.0133C5 15.9362 5.01693 15.4244 5.09089 13.8236C5.16366 12.2254 5.41701 11.1338 5.78803 10.1795C6.17118 9.19172 6.68389 8.35422 7.51923 7.51996C8.35457 6.6857 9.19051 6.17152 10.178 5.78826Z"/>
                                </svg>
                                <span>algo.particular</span>
                            </a>
                        </div>
                    </div>
                </div>
                <div class="shareSection">
                    <div class="col">
                        <div class="copy">
                            <h2>{{ $t("collaborate.cocreateTitle") }}</h2>
                            <p>{{ $t("collaborate.cocreateDescrip") }}</p>
                            
                            <a href="mailto:algoparticular@gmail.com" target="_blank" class="button hasIcon">
                                <svg class="icon" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M35 7.5H5C4.66848 7.5 4.35054 7.6317 4.11612 7.86612C3.8817 8.10054 3.75 8.41848 3.75 8.75V30C3.75 30.663 4.01339 31.2989 4.48223 31.7678C4.95107 32.2366 5.58696 32.5 6.25 32.5H33.75C34.413 32.5 35.0489 32.2366 35.5178 31.7678C35.9866 31.2989 36.25 30.663 36.25 30V8.75C36.25 8.41848 36.1183 8.10054 35.8839 7.86612C35.6495 7.6317 35.3315 7.5 35 7.5ZM21.8906 19.0625L20 20.7969L8.21875 10H31.7812L21.8906 19.0625ZM15.4219 20L6.25 28.4063V11.5937L15.4219 20ZM17.2656 21.7031L19.1562 23.4219C19.3867 23.6327 19.6877 23.7496 20 23.7496C20.3123 23.7496 20.6133 23.6327 20.8437 23.4219L22.7344 21.7031L31.7812 30H8.21875L17.2656 21.7031ZM24.5781 20L33.75 11.5937V28.4063L24.5781 20Z"/>
                                </svg>
                                <span> {{ $t("collaborate.cocreateAction") }} </span>
                            </a>
                        </div>
                    </div>

                    <kinesis-container class="col ilustration" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100" event="scroll">
                        <kinesis-element 
                            class="gfx cocreate sincronicidad"
                            tag="img"
                            src="/assets/cocreate/sincronicidad.webp"
                            loading=”lazy”
                            :strength="60"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx cocreate encuentro"
                            tag="img"
                            src="/assets/cocreate/encuentro.webp"
                            loading=”lazy”
                            :strength="50"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx cocreate larva1"
                            tag="img"
                            src="/assets/cocreate/larva1.webp"
                            loading=”lazy”
                            :strength="40"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx cocreate larva2"
                            tag="img"
                            src="/assets/cocreate/larva2.webp"
                            loading=”lazy”
                            :strength="40"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx cocreate isla"
                            tag="img"
                            src="/assets/cocreate/isla.webp"
                            loading=”lazy”
                            :strength="30"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx cocreate amarillo"
                            tag="img"
                            src="/assets/cocreate/amarillo.webp"
                            loading=”lazy”
                            :strength="20"                            
                            type="translate"/>
                        <kinesis-element 
                            class="gfx cocreate rojo"
                            tag="img"
                            src="/assets/cocreate/rojo.webp"
                            loading=”lazy”
                            :strength="20"                            
                            type="translate"/>
                    </kinesis-container>
                </div>
            </section>

            <section id="donate">
                <div class="donateSection">
                    <div class="copy">
                        <h2>{{ $t("collaborate.donateTitle") }}</h2>
                        <p>{{ $t("collaborate.donateDescrip") }}</p>
                        
                        <a href="https://cafecito.app/algoparticular" target="_blank" class="button hasIcon">
                            <svg class="icon" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M10.0002 4.16699C9.55814 4.16699 9.13421 4.34259 8.82165 4.65515C8.50909 4.96771 8.3335 5.39163 8.3335 5.83366V9.16699C8.3335 9.60902 8.50909 10.0329 8.82165 10.3455C9.13421 10.6581 9.55814 10.8337 10.0002 10.8337C10.4422 10.8337 10.8661 10.6581 11.1787 10.3455C11.4912 10.0329 11.6668 9.60902 11.6668 9.16699V5.83366C11.6668 5.39163 11.4912 4.96771 11.1787 4.65515C10.8661 4.34259 10.4422 4.16699 10.0002 4.16699ZM21.6665 35.8333C24.0298 35.833 26.3167 34.996 28.1218 33.4707C29.9269 31.9453 31.1336 29.8301 31.5282 27.5H31.6665C33.4346 27.5 35.1303 26.7976 36.3805 25.5474C37.6308 24.2971 38.3332 22.6014 38.3332 20.8333C38.3332 19.0652 37.6308 17.3695 36.3805 16.1193C35.1303 14.869 33.4346 14.1667 31.6665 14.1667V12.5H1.6665V25.8333C1.6665 28.4855 2.72007 31.029 4.59544 32.9044C6.4708 34.7798 9.01434 35.8333 11.6665 35.8333H21.6665ZM4.99984 15.8333V25.8333C4.99984 27.6014 5.70222 29.2971 6.95246 30.5474C8.2027 31.7976 9.89839 32.5 11.6665 32.5H21.6665C23.4346 32.5 25.1303 31.7976 26.3805 30.5474C27.6308 29.2971 28.3332 27.6014 28.3332 25.8333V15.8333H4.99984ZM34.9998 20.8333C34.9998 21.7174 34.6486 22.5652 34.0235 23.1904C33.3984 23.8155 32.5506 24.1667 31.6665 24.1667V17.5C32.5506 17.5 33.3984 17.8512 34.0235 18.4763C34.6486 19.1014 34.9998 19.9493 34.9998 20.8333ZM15.4882 4.65515C15.1756 4.96771 15 5.39163 15 5.83366V9.16699C15 9.60902 15.1756 10.0329 15.4882 10.3455C15.8007 10.6581 16.2246 10.8337 16.6667 10.8337C17.1087 10.8337 17.5326 10.6581 17.8452 10.3455C18.1577 10.0329 18.3333 9.60902 18.3333 9.16699V5.83366C18.3333 5.39163 18.1577 4.96771 17.8452 4.65515C17.5326 4.34259 17.1087 4.16699 16.6667 4.16699C16.2246 4.16699 15.8007 4.34259 15.4882 4.65515ZM22.1548 4.65515C22.4674 4.34259 22.8913 4.16699 23.3333 4.16699C23.7754 4.16699 24.1993 4.34259 24.5118 4.65515C24.8244 4.96771 25 5.39163 25 5.83366V9.16699C25 9.60902 24.8244 10.0329 24.5118 10.3455C24.1993 10.6581 23.7754 10.8337 23.3333 10.8337C22.8913 10.8337 22.4674 10.6581 22.1548 10.3455C21.8423 10.0329 21.6667 9.60902 21.6667 9.16699V5.83366C21.6667 5.39163 21.8423 4.96771 22.1548 4.65515Z"/>
                            </svg>
                            <span>cafecito.app</span>
                        </a>

                        <p>{{ $t("collaborate.donateWorld") }}</p>
                        <a href="https://revolut.me/juanmanuelynz" target="_blank" class="button hasIcon">
                            <svg class="icon" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M31.3887 30.1425C31.9322 31.3913 31.3851 32.9688 30.2508 33.605C29.6019 33.97 28.8587 34.3088 28.1166 34.4988C26.8927 34.8008 25.6413 34.9688 24.3833 35C22.3714 35 20.3534 33.81 19.4842 32.3625C19.2603 32.8625 18.4492 33.8663 17.0268 34.3388C16.1298 34.6388 15.0476 35 12.7875 34.9975C10.7623 34.9962 9.60741 34.0475 8.99851 33.2525C8.02523 31.9875 7.88239 30.38 8.07244 29.2975L8.08213 29.245C8.84598 25.2863 9.89068 18.0888 10.3725 14.4825L10.3773 14.4475C10.5081 13.4475 10.6424 12.4475 10.7223 11.44C10.7611 10.9325 10.7877 10.4225 10.7925 9.91378C10.7974 9.43253 10.755 8.95128 10.7586 8.47129C10.7635 8.01754 10.8349 7.55879 11.0407 7.15629C11.388 6.50698 11.9566 6.01422 12.6362 5.77379C13.3468 5.52879 14.0888 5.43004 14.8285 5.34129C15.5839 5.24815 16.3411 5.17022 17.0995 5.10754C18.0244 5.03717 18.9514 5.00131 19.8789 5.00004C21.4647 4.99879 23.0626 5.02504 24.6254 5.35879C26.2185 5.69754 27.8285 6.34629 29.085 7.48254C29.9457 8.26129 30.6297 9.24253 31.143 10.3175C31.5933 11.265 31.7761 12.2613 31.885 13.0225C32.0784 14.3897 32.0275 15.7818 31.7349 17.13C31.5038 18.1133 31.1137 19.0493 30.5813 19.8988C29.9833 20.8588 29.2146 21.73 28.2364 22.5588C28.832 24.3463 30.3864 27.8363 31.3887 30.1425V30.1425ZM13.5695 8.65253C13.6083 9.31503 13.6131 9.98253 13.5853 10.6475C13.5556 11.3267 13.5031 12.0046 13.4279 12.68C13.3552 13.3525 13.2681 14.0238 13.1797 14.6938L13.1507 14.9125C12.8722 17.0088 12.5805 19.1025 12.273 21.1925C11.9437 23.3855 11.5943 25.5752 11.2247 27.7613C11.0564 28.7813 10.6799 30.0875 11.1956 31.0613C11.6556 31.93 12.8347 32.0363 13.6579 31.9488C16.6528 31.6325 17.1285 30.945 17.1285 30.945C16.5317 30.2613 17.051 27.1463 17.6515 22.96H19.7808L22.0082 29.9188C22.0082 29.9188 22.6655 32.0738 24.4898 31.97C26.8286 31.8375 28.5488 31.285 28.7969 30.9788C28.0767 30.5638 26.0175 25.2475 24.8966 21.3438C25.4389 21.0013 25.9655 20.63 26.463 20.2138C27.1409 19.6425 27.7704 18.9838 28.251 18.21C28.6018 17.6529 28.8596 17.039 29.0136 16.3938C29.0893 16.0473 29.1399 15.6955 29.1649 15.3413C29.2153 14.7219 29.1966 14.0987 29.1092 13.4838C29.0245 12.8938 28.8998 12.2375 28.6456 11.7063C28.1711 10.71 27.5004 9.84128 26.5865 9.28628C25.043 8.34879 23.2635 8.17129 21.53 8.07379C19.6491 7.96565 17.7626 8.02923 15.8925 8.26379C15.6819 8.28879 13.561 8.48254 13.5707 8.65129L13.5695 8.65253ZM19.3002 11.3463C18.9419 13.9525 18.655 16.1488 18.1381 19.5675C19.5339 19.5363 22.7018 20.11 23.3991 15.4375C23.9765 11.55 21.4029 11.19 19.3002 11.3463Z"/>
                            </svg>
                            <span>Revolut Me</span>
                        </a>
                    </div>
                </div>

                <kinesis-container class="ilustration" easing="cubic-bezier(0.23, 1, 0.32, 1)" :perspective="100" event="scroll">
                    <kinesis-element 
                        class="gfx inmind samita"
                        tag="img"
                        src="/assets/inmind/samita.webp"
                        loading=”lazy”
                        :strength="50"                            
                        type="translate"/>
                    <!-- <kinesis-element 
                        class="gfx inmind larvas"
                        tag="img"
                        src="/assets/inmind/larvas.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/>
                    <kinesis-element 
                        class="gfx inmind nucleo"
                        tag="img"
                        src="/assets/inmind/nucleo.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/>
                    <kinesis-element 
                        class="gfx inmind mitocondria"
                        tag="img"
                        src="/assets/inmind/mitocondria.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/>
                    <kinesis-element 
                        class="gfx inmind puntitos"
                        tag="img"
                        src="/assets/inmind/puntitos.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/>
                    <kinesis-element 
                        class="gfx inmind interior"
                        tag="img"
                        src="/assets/inmind/interior.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/> -->
                    <kinesis-element 
                        class="gfx inmind interior"
                        tag="img"
                        src="/assets/inmind/interiorfull.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/> 
                    <kinesis-element 
                        class="gfx inmind celula"
                        tag="img"
                        src="/assets/inmind/celula.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/>
                    <kinesis-element 
                        class="gfx inmind particulas"
                        tag="img"
                        src="/assets/inmind/particulas.webp"
                        loading=”lazy”
                        :strength="20"                            
                        type="translate"/>
                </kinesis-container>

                <div id="next" class="donateSection">
                    <div class="next">
                        <h2>{{ $t("collaborate.whatsNext") }}</h2>
                        <ul>
                            <li v-for="(steps, i) in 6">
                                {{ $t("collaborate.next["+i+"]") }}
                            </li>
                        </ul>
                    </div>                    
                </div>
            </section>
            
            <section id="forKids">
                <div class="copy">
                    <h4>{{ $t("collaborate.forKids") }}</h4>
                    <p>{{ $t("collaborate.kids") }}</p>
                </div>
            </section>
           
		</main> 
        <Footer />
	</div>
</template>


<style scoped>
    .content {
        /* background-color: #143246; */
        height: auto;
    }

    section {
        height: 100vh;
        width: 100vw;
        position: relative;
    }

    .button {
        min-width: 240px;
    }

    p {
        margin: 0;
    }

    .gfx {        
        position: absolute;
        z-index: 3;
        height: auto;      
    }
</style>

<!-- Hero -->
<style scoped>    
    /* HERO */
	#hero {
        background-color: #A7DCD6;
        height: 90vh;
        padding: 5vh 0;
        box-shadow: inset 0px 6px 63px rgb(0 127 136 / 36%), inset 0px -6px 64px rgb(20 50 70 / 90%);
    }

    h1 {
        color: #14525D;
        position: absolute;
        z-index: 10;
        top: 23vh;
        left: 7vw;         
        
        text-align: left;
        width: 86vw;
        font-size: 28px;
        letter-spacing: 0px;
        line-height: 110%;
    }    

    .splash.sun {
        z-index: 5;
        width: 13vh;
        right: 18vw;
        top: 27vh;
    }

    .splash.boat {
        z-index: 9;
        width: 80vw;
        left: 7vw;
        top: 42vh;
    }

    .splash.mushrooms {
        z-index: 7;
        width: 180vw;
        bottom: 0;
    }

    .splash.plants {
        z-index: 6;
        width: 180vw;
        bottom: 0;
    }

    .splash.particles {
        z-index: 5;
        width: 130vw;
        bottom: 9vh;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        h1 {
            top: 7vh;
            left: 2vw; 
            
            max-width: 30vw;        
            font-size: 32px;
        }

        .splash.sun {
            width: 18vh;
            right: 23vw;
            top: 13vh;
        }

        .splash.boat {
            width: 42vw;
            left: 27vw;
            top: 13vh;
        }

        .splash.mushrooms {
            width: 100vw;
            bottom: 0;
        }

        .splash.plants {
            width: 100vw;
            bottom: 0;
        }

        .splash.particles {
            width: 99vw;
            bottom: 13vh;
        }
    }
</style>

<!-- Share -->
<style scoped>
    #share {
        background-color: #009EAC;
        height: auto;
        padding-bottom: 10vh;
    }

    .shareSection {
        height: auto;

        display: flex;
        justify-content: center;
        flex-direction: column;
    }

    .shareSection.invert {
        flex-direction: column-reverse;
    }

    .shareSection .col {
        width: 100vw;
        height: 70vh;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .copy {
        display: flex;
        flex-direction: column;
        gap: 24px;
        justify-content: center;
        align-items: center;

        width: 342px;
    }

    .copy h2 {
        color: #F7F8F1;
        /* font-size: 48px; */
    }

    .copy p {
        text-align: center;
    }

    #share a.button span {
        color: #007475;
    }

    #share a.button path {
        fill: #007475;
    }

    #share a.button:hover span {
        color: #F7F8F1;
    }

    #share a.button:hover path {
        fill: #F7F8F1;
    }

    /* GFX */
    .share.fire {
        z-index: 7;
        width: 9vw;
        bottom: 32vh;
    }

    .share.particles {
        z-index: 6;
        width: 50vw;
        bottom: 20vh;
    }

    .share.island {
        z-index: 5;
        width: 80vw;
        bottom: 11vh;
    }

    .share.yellow,
    .share.red {
        width: 110vw;
        /* bottom: 3vh; */
    }

    .share.yellow {
        z-index: 4;
    }

    .cocreate.sincronicidad {
        z-index: 8;
        width: 36vw;
        top: 30vh;
        left: 13vw;
    }
    
    .cocreate.encuentro {
        z-index: 7;
        width: 30vw;
        top: 20vh;
        left: 40vw;
    }

    .cocreate.larva1 {
        z-index: 6;
        width: 10vw;
        top: 10vh;
        left: 36vw;
    }

    .cocreate.larva2 {
        z-index: 6;
        width: 10vw;
        top: 16vh;
        left: 20vw;
    }

    .cocreate.isla {
        z-index: 5;
        width: 80vw;
        bottom: 9vh;
    }

    .cocreate.amarillo {
        z-index: 4;
        width: 150vw;
    }

    .cocreate.rojo {   
        width: 150vw;     
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        #share {
            padding-bottom: 0;
        }

        .shareSection {
            flex-direction: row;
            justify-content: space-around;
        }

        .shareSection .col {
            width: 50vw;
            height: 100vh;
        }

        .share.fire {
            width: 3vw;
            bottom: 46vh;
        }

        .share.particles {
            width: 21vw;
            bottom: 27vh;
        }

        .share.island {
            width: 33vw;
            bottom: 13vh;
        }

        .share.yellow,
        .share.red {
            width: 42vw;
        }

        .cocreate.sincronicidad {
            width: 11vw;
            top: 42vh;
            left: 13vw;
        }

        .cocreate.encuentro {
            width: 8vw;
            top: 32vh;
        }

        .cocreate.larva1 {
            width: 3vw;
            top: 20vh;
            left: 20vw;
        }

        .cocreate.larva2 {
            width: 3vw;
            top: 25vh;
            left: 15vw;
        }

        .cocreate.isla {
            width: 33vw;
            bottom: 21vh;
        }

        .cocreate.amarillo,
        .cocreate.rojo {
            width: 50vw;
        }        
    }

    /* DESKTOP XL */
    @media screen and (min-width: 1439px) {        
        .share.fire {
            bottom: 50vh;
        }

        .share.particles {
            bottom: 29vh;
        }

        .cocreate.isla {            
            bottom: 13vh;
        }
    }
</style>

<style scoped>
    #donate {
        background-color: #F7F8F1;
        height: auto;
        padding-top: 1vh;
    }

    .donateSection {
        width: 80vw;
        height: 80vh;
        padding: 0 10vw;

        display: flex;
        justify-content: center;
        align-items: center;
    }

    #donate h2 {
        text-align: center;
        color: #E9EDD8;
    }

    #donate .copy h2,
    #donate .copy p {
        color: #143246;
    }

    #donate a.button {
        background-color: #143246; 
    }

    #donate a.button span {
        color: #F7F8F1;
    }

    #donate a.button path {
        fill: #F7F8F1;
    }

    #donate a.button:hover {
        background-color: #FF6F61; 
    }

    #donate a.button:hover span {
        color: #F7F8F1;
    }

    #donate a.button:hover path {
        fill: #F7F8F1;
    }

    #next {
        height: 90vh;
    }

    .donateSection .next {
        display: flex;
        flex-direction: column;
        gap: 80px;
        width: 80vw;
    }

    #donate ul {
        list-style: none;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10vw;
        padding: 0 10vw;
    }

    #donate li {
        color: #F7F8F1;
        text-align: center;
        width: 80vw;
    }

    /* ILUSTRATION */
    #donate .ilustration {
        height: 100vh;
    }

    .inmind.samita {
        z-index: 6;
        width: 11vw;
        top: 32vh;
        left: 33vw;
    }
/* 
    .inmind.larvas {
        z-index: 5;
        width: 11vw;
        top: 46vh;
        left: 25vw;
    }

    .inmind.nucleo {
        z-index: 6;
        width: 18vw;
        top: 36vh;
        left: 47vw;
    }

    .inmind.mitocondria {
        z-index: 5;
        width: 11vw;
        top: 38vh;
        left: 67vw;
    }

    .inmind.puntitos {
        z-index: 5;
        width: 6vw;
        top: 31vh;
        left: 50vw;
    } */

    .inmind.interior {
        z-index: 4;
    }

    .inmind.interior,
    .inmind.celula,
    .inmind.particulas {
        width: 180vw;
        left: -42vw;
    }

    /* DESKTOP Small */
    @media screen and (min-width: 769px) and (max-width: 1280px) {   
        #donate ul {            
            gap: 5vw;
            padding: 0 10vw;
        }

        #donate li {
            width: 15vw;
        }     
        .inmind.samita {
            width: 4vw;
            top: 43vh;
            left: 44vw;
        }
/* 
        .inmind.larvas {
            width: 4vw;
            top: 60vh;
            left: 42vw;
        }

        .inmind.nucleo {
            width: 7vw;
            top: 48vh;
            left: 50vw;
        }

        .inmind.mitocondria {
            width: 4vw;
            top: 50vh;
            left: 58vw;
        }

        .inmind.puntitos {
            width: 3vw;
            top: 40vh;
            left: 50vw;
        } */

        .inmind.interior,
        .inmind.celula,
        .inmind.particulas {
            width: 70vw;
            left: 15vw;
        }
    }

    /* DESKTOP */
    @media screen and (min-width: 1281px) {

        #donate ul {            
            gap: 5vw;
            padding: 0 10vw;
        }

        #donate li {
            width: 15vw;
        }

        .inmind.samita {
            width: 4vw;
            top: 49vh;
            left: 44vw;
        }

        .inmind.larvas {
            width: 4vw;
            top: 68vh;
            left: 42vw;
        }

        .inmind.nucleo {
            width: 7vw;
            top: 54vh;
            left: 50vw;
        }

        .inmind.mitocondria {
            width: 4vw;
            top: 58vh;
            left: 58vw;
        }

        .inmind.puntitos {
            width: 3vw;
            top: 46vh;
            left: 50vw;
        }

        .inmind.interior,
        .inmind.celula,
        .inmind.particulas {
            width: 70vw;
            left: 15vw;
        }
    }        
</style>

<style scoped>
    #forKids {
        background-color: #71838F;
        height: 50vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
</style>