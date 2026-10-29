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
                :hasFullDeck="true"
                />
        </div>
        <div class="wrapper">
            <img src="../assets/Logo_blue.svg" loading="lazy"/>
            <div class="social-nav">
                <a class="social lab" href="/praxis" :aria-label="$t('nav.praxis')" @click.prevent="handleNavigate('/praxis')">
                    <svg class="icon lab" viewBox="0 0 40 40" fill="#143246" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M3.25 20.7531C3.25 11.6495 10.7274 4.25 20 4.25C29.2726 4.25 36.75 11.6495 36.75 20.7531C36.75 24.542 35.8392 27.2447 34.5482 29.1894C33.2539 31.139 31.5225 32.4089 29.7552 33.239C27.981 34.0724 26.1898 34.4524 24.8297 34.6213C24.1529 34.7053 23.5916 34.736 23.2044 34.7459C23.011 34.7508 22.8618 34.7505 22.7641 34.7491C22.7153 34.7484 22.6794 34.7475 22.6574 34.7468L22.634 34.746L22.6329 34.7459L22.6317 34.7459L22.6037 34.7445H22.5733C20.4074 34.7445 18.6767 33.0129 18.6767 30.9184V27.1256H22.6027C26.1438 27.1256 29.0581 24.2967 29.0581 20.7645C29.0581 15.8155 24.9841 11.8479 20 11.8479C15.0159 11.8479 10.9419 15.8155 10.9419 20.7645C10.9419 21.4549 11.5016 22.0145 12.1919 22.0145C12.8823 22.0145 13.4419 21.4549 13.4419 20.7645C13.4419 17.2391 16.3534 14.3479 20 14.3479C23.6466 14.3479 26.5581 17.2391 26.5581 20.7645C26.5581 22.8731 24.8064 24.6256 22.6027 24.6256H18.6767V20.7531C18.6767 20.0568 19.2564 19.4651 20 19.4651C20.7526 19.4651 21.3233 20.0526 21.3233 20.7531C21.3233 21.4435 21.883 22.0031 22.5733 22.0031C23.2637 22.0031 23.8233 21.4435 23.8233 20.7531C23.8233 18.6394 22.1007 16.9651 20 16.9651C17.9169 16.9651 16.1767 18.6353 16.1767 20.7531V24.6256H12.2054C10.0017 24.6256 8.25 22.8731 8.25 20.7645C8.25 14.432 13.4944 9.25 20 9.25C26.5064 9.25 31.75 14.4196 31.75 20.7645C31.75 23.3847 31.1478 25.182 30.3304 26.4276C29.5125 27.6739 28.4211 28.4563 27.2979 28.9504C26.165 29.4489 25.013 29.6472 24.1291 29.7168C23.6908 29.7513 23.3281 29.7534 23.08 29.7473C22.9562 29.7443 22.8617 29.7393 22.8015 29.7353C22.7714 29.7333 22.7499 29.7316 22.7377 29.7306L22.7282 29.7298L22.7261 29.7296C22.0407 29.6615 21.429 30.1611 21.3591 30.8468C21.2892 31.5336 21.7892 32.1471 22.476 32.217L22.6027 30.9735C22.476 32.217 22.4767 32.2171 22.4774 32.2172L22.4832 32.2177L22.4941 32.2188L22.5274 32.2217C22.5545 32.224 22.5914 32.2269 22.6374 32.2299C22.7295 32.236 22.8584 32.2427 23.0189 32.2466C23.3394 32.2544 23.789 32.2513 24.3254 32.2091C25.3911 32.1251 26.8384 31.8839 28.3048 31.2387C29.781 30.5892 31.2889 29.5236 32.4205 27.7993C33.5525 26.0743 34.25 23.7784 34.25 20.7645C34.25 12.9943 27.8421 6.75 20 6.75C12.157 6.75 5.75 13.0084 5.75 20.7645C5.75 24.2967 8.66427 27.1256 12.2054 27.1256H16.1767V30.9184C16.1767 34.4175 19.0453 37.2307 22.5476 37.2444L22.5778 37.2455C22.6141 37.2467 22.6649 37.248 22.729 37.2489C22.8573 37.2507 23.0395 37.2509 23.268 37.2451C23.7245 37.2334 24.3684 37.1978 25.1378 37.1022C26.6702 36.9119 28.7357 36.4799 30.8181 35.5018C32.9075 34.5204 35.0328 32.9795 36.631 30.5721C38.2324 28.1599 39.25 24.9597 39.25 20.7531C39.25 10.2363 30.6207 1.75 20 1.75C9.37931 1.75 0.75 10.2363 0.75 20.7531C0.75 27.0618 5.92598 32.1421 12.28 32.1421C12.9704 32.1421 13.53 31.5825 13.53 30.8921C13.53 30.2018 12.9704 29.6421 12.28 29.6421C7.27402 29.6421 3.25 25.6486 3.25 20.7531Z"/>
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

    /* Same visual weight: the oracle icon sits inside a wide margin of its box, Instagram fills its own */
    .social .icon.instagram {
        width: 27px;
    }

    .social .icon.lab {
        width: 35px;
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
        font-family: 'Nunito', helvetica, sans-serif;
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