<script setup>
    import { onMounted, onUpdated, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

    const isLoggedIn = ref(false);
    const router = useRouter();
    let auth;

    const props = defineProps({
        hasIntro: Boolean,
        hasHome: Boolean,
        hasPraxis: Boolean,
        hasFullDeck: Boolean,
        hasAbout: Boolean,
        hasCollaborate: Boolean,
    });

    const emit = defineEmits(['navigate','langChanged']); 

    //handle sign out
    const handleSignOut = () => {
        signOut(auth).then (() => {
            router.push('/');
        });
    }; 

    const navigate = (path) => {
        emit('navigate', path);
    }

    const langChanged = (lang) => {
        emit('langChanged', lang);
    }

    //ON MOUNTED
	onMounted (() => {
        
    });

    onUpdated (() => {
        //check user logged in or not
        auth = getAuth();
        onAuthStateChanged (auth, (user) => {
            if (user) {
                isLoggedIn.value = true;
            } else {
                isLoggedIn.value = false;
            }
        });
    });
</script>


<template>
    <nav id="menu">
        <a v-if="props.hasHome" @click="navigate('/')">{{ $t("nav.home") }}</a>
        <a v-if="props.hasPraxis" @click="navigate('/praxis')">{{ $t("nav.praxis") }}</a>
        <a v-if="props.hasFullDeck" @click="navigate('/deck')">{{ $t("nav.deck") }}</a>
        <a v-if="props.hasIntro" @click="navigate('/intro')">{{ $t("nav.intro") }}</a>
        
        <a v-if="props.hasAbout" @click="navigate('/about')">{{ $t("nav.about") }}</a>
        <a v-if="props.hasCollaborate" @click="navigate('/collaborate')">{{ $t("nav.collaborate") }}</a>

        <div id="languageSelect">
            <input type="radio" id="lang-es" value="es" v-model="$i18n.locale" @change="langChanged($i18n.locale)"/>
            <label for="lang-es" :class="{active: $i18n.locale == 'es'}">Español</label>
            <span>|</span>
            <input type="radio" id="lang-en" value="en" v-model="$i18n.locale" @change="langChanged($i18n.locale)"/>
            <label for="lang-en" :class="{active: $i18n.locale == 'en'}">English</label>
        </div>

        <!-- <div v-if="isLoggedIn">
            <a class="logout" @click="handleSignOut" v-if="isLoggedIn">{{ $t("nav.logout") }}</a>
        </div>
        <div v-else>
            <a @click="navigate('/register')">{{ $t("nav.register") }}</a>
            <a @click="navigate('/sign-in')">{{ $t("nav.signin") }}</a>
        </div> -->
    </nav>
</template>


<style scoped>
    nav, nav div {
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 24px;
    }

    nav {
        padding: 0 0 16px;
    }

    nav a,
    #languageSelect label {
        font-size: 21px;
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        cursor: pointer;
    }

    nav a:hover,
    #languageSelect label:hover {
        color: #143246;
    }

    a.logout {
        color: #363636;
    }

    /* Language */
    #languageSelect {
        display: flex;
        flex-direction: row;
    }

    #languageSelect input {
        display: none;
    }

    #languageSelect label {
        color: #F7F8F1;
    }

    #languageSelect label.active {
        color: #143246;
    }

    #languageSelect span {
        font-size: 24px;
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-weight: 400;
        color: #F7F8F1;

        /* NOT SELECTABLE */
        -webkit-touch-callout: none; /* iOS Safari */
        -webkit-user-select: none; /* Safari */
        -khtml-user-select: none; /* Konqueror HTML */
        -moz-user-select: none; /* Old versions of Firefox */
            -ms-user-select: none; /* Internet Explorer/Edge */
                user-select: none; /* Non-prefixed version, currently
                                    supported by Chrome, Edge, Opera and Firefox */
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        nav {
            padding: 0;
        }
    }
</style>