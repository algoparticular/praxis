<script setup>
    import { onMounted, ref } from 'vue';
    import { useRouter } from 'vue-router'; 
    import Menu from './Menu.vue';   

    const router = useRouter();    

    //handle navigation
    const handleNavigate = (url) => {        
        router.push({ path: url }); 
    };

    //handle language change
    function handleLangChanged(lang) {		
		localStorage.setItem("lang", lang);
	}
</script>

<template>
    <footer>
        <div class="wrapper">
            <img src="../assets/Logo_blue.svg" loading="lazy"/>
            <div class="social-nav">
                <a class="social twit" href="https://www.twitter.com/in/algoparticular" target="_blank">                        
                    <svg class="icon twitter" viewBox="0 0 50 50" fill="#143246" xmlns="http://www.w3.org/2000/svg">
                        <path d="M44.748 14.3406C44.7782 14.7781 44.7782 15.2156 44.7782 15.6571C44.7782 29.1108 34.5363 44.6269 15.8085 44.6269V44.6188C10.2762 44.6269 4.85886 43.0422 0.201599 40.0543C1.00603 40.1511 1.8145 40.1995 2.62499 40.2015C7.20966 40.2055 11.6633 38.6672 15.2701 35.8345C10.9133 35.7519 7.09273 32.9112 5.75805 28.764C7.28426 29.0583 8.85684 28.9978 10.3548 28.5886C5.60483 27.6289 2.18749 23.4555 2.18749 18.6087C2.18749 18.5644 2.18749 18.522 2.18749 18.4797C3.60281 19.268 5.18749 19.7055 6.80845 19.7539C2.33466 16.764 0.955631 10.8124 3.65724 6.15914C8.8266 12.52 16.4536 16.387 24.6411 16.7962C23.8206 13.2599 24.9415 9.5543 27.5867 7.06842C31.6875 3.21358 38.1371 3.41116 41.9919 7.50995C44.2722 7.06035 46.4576 6.22366 48.4576 5.03817C47.6976 7.39503 46.1068 9.39705 43.9818 10.6692C46 10.4313 47.9718 9.891 49.8286 9.0664C48.4617 11.1148 46.7399 12.8991 44.748 14.3406Z"/>
                    </svg>
                </a>
                <a class="social insta" href="https://instagram.com/algo.particular" target="_blank">
                    <svg class="icon instagram" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 551.034 551.034" xml:space="preserve" fill="#143246">
                        <path d="M386.878,0H164.156C73.64,0,0,73.64,0,164.156v222.722 c0,90.516,73.64,164.156,164.156,164.156h222.722c90.516,0,164.156-73.64,164.156-164.156V164.156 C551.033,73.64,477.393,0,386.878,0z M495.6,386.878c0,60.045-48.677,108.722-108.722,108.722H164.156 c-60.045,0-108.722-48.677-108.722-108.722V164.156c0-60.046,48.677-108.722,108.722-108.722h222.722 c60.045,0,108.722,48.676,108.722,108.722L495.6,386.878L495.6,386.878z"/>
                        <path d="M275.517,133C196.933,133,133,196.933,133,275.516 s63.933,142.517,142.517,142.517S418.034,354.1,418.034,275.516S354.101,133,275.517,133z M275.517,362.6 c-48.095,0-87.083-38.988-87.083-87.083s38.989-87.083,87.083-87.083c48.095,0,87.083,38.988,87.083,87.083 C362.6,323.611,323.611,362.6,275.517,362.6z"/>
                        <circle cx="418.306" cy="134.072" r="34.149"/>
                    </svg>
                </a>               
            </div>
        </div>
        <div class="wrapper">
            <Menu 
                class="inFooter"
                @navigate="handleNavigate"
                @langChanged="handleLangChanged"
                :hasHome="true"
                :hasIntro="false"
                :hasPraxis="true"
                :hasFullDeck="true"
                :hasAbout="true"
                :hasCollaborate="true"
                />
            <span class="copyright">© Algo Particular</span>
        </div>
    </footer>
</template>

<style>    
    footer {
        background: #F7F8F1;
        width: 100vw;
        padding: 64px 0 40px;
        
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 56px;
    }

    footer .wrapper {
        width: 85%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 48px;
    }

    footer img {
        height: 58px;
    }

    .social-nav {
        display: flex;
        justify-content: center;
        margin: 0;    
        gap: 40px;
    }
    .social {
        margin-bottom: 0;  

        display: flex;
        align-items: center;

        font-size: 16px;
        height: 30px;
    }
    .social:focus {
        border-radius: 6px;
        box-shadow: rgba(12, 151, 139, .3) 0px 0px 0px 4px;
        outline: 0px;

        -webkit-transition: all 300ms ease-out;
        -moz-transition: all 300ms ease-out;
        -o-transition: all 300ms ease-out;
        transition: all 300ms ease-out;
    }

    .social .icon {
        width: 30px;
        height: auto;                               
    }  

    .social .icon:hover {
        fill: #FF6F61;
        -webkit-transition: all 250ms ease-out;
        -moz-transition: all 250ms ease-out;
        -o-transition: all 250ms ease-out;
        transition: all 250ms ease-out;
    } 

    nav.inFooter {        
        /* gap: 24px; */
    }

    nav.inFooter #languageSelect {
        gap: 16px;
    }

    nav.inFooter a,
    nav.inFooter #languageSelect label,
    nav.inFooter #languageSelect span {
        color: #143246;
        font-family: 'Inter', Helvetica, sans-serif;
        font-size: 16px;
        line-height: 100%;
    }

    nav.inFooter a:hover,
    nav.inFooter #languageSelect label:hover {
        color: #FF6F61;
    }
    
    span.copyright {
        color: #143246;
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        footer {
            gap: 40px;
        }   

        footer .wrapper {
            flex-direction: row;
            justify-content: space-between;            
        }

        nav.inFooter {
            align-items:flex-start;
            gap: 16px;
        }

        span.copyright {
            display: flex;
            align-self: flex-end;
        }
    }
</style>