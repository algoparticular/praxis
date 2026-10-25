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
        </div>
        <div class="wrapper">
            <img src="../assets/Logo_blue.svg" loading="lazy"/>
            <div class="social-nav">
                <a class="social insta" href="https://instagram.com/algo.particular" target="_blank">
                    <svg class="icon instagram" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 551.034 551.034" xml:space="preserve" fill="#143246">
                        <path d="M386.878,0H164.156C73.64,0,0,73.64,0,164.156v222.722 c0,90.516,73.64,164.156,164.156,164.156h222.722c90.516,0,164.156-73.64,164.156-164.156V164.156 C551.033,73.64,477.393,0,386.878,0z M495.6,386.878c0,60.045-48.677,108.722-108.722,108.722H164.156 c-60.045,0-108.722-48.677-108.722-108.722V164.156c0-60.046,48.677-108.722,108.722-108.722h222.722 c60.045,0,108.722,48.676,108.722,108.722L495.6,386.878L495.6,386.878z"/>
                        <path d="M275.517,133C196.933,133,133,196.933,133,275.516 s63.933,142.517,142.517,142.517S418.034,354.1,418.034,275.516S354.101,133,275.517,133z M275.517,362.6 c-48.095,0-87.083-38.988-87.083-87.083s38.989-87.083,87.083-87.083c48.095,0,87.083,38.988,87.083,87.083 C362.6,323.611,323.611,362.6,275.517,362.6z"/>
                        <circle cx="418.306" cy="134.072" r="34.149"/>
                    </svg>
                </a>               
            </div>
        </div>
        <span class="copyright">© Algo Particular</span>
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
        color: rgba(20, 50, 70, 0.5);
        font-size: 13px;
        width: 85%;
        margin-top: -24px;
        text-align: center;
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
            margin-top: -16px;
        }
    }
</style>