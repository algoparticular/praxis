<script setup>
    import Header from '../components/Header.vue';		
    import DeckTemplate from '../components/DeckTemplate.vue';
    import DeckTemplateSkeleton from '../components/DeckTemplateSkeleton.vue';

    import { onBeforeMount, onBeforeUnmount, ref } from 'vue'; 
	import { getAuth } from 'firebase/auth';
	import { useRouter } from 'vue-router';    

	const router = useRouter();
	const auth = getAuth();

	//Harcoded amount of cards.. help me :P
	// 
	const cardsAmount = ref(33);

	const authListener = auth.onAuthStateChanged(function(user) {
		if (!user) { // not logged in
			// alert('you must be logged in to view this. redirecting to the home page');
			router.push('/');
		}
	});

	onBeforeUnmount(() => {
		// clear up listener
		authListener();
	});

</script>

<template>
    <div class="content deck"> 
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
		<h2>{{ $t("message.praxisCollectionTitle") }}</h2>
		<p>{{ $t("message.praxisCollectionDescrip") }}</p>

        <Suspense>
            <template #default>
                <DeckTemplate :amountOfCards="cardsAmount"/>
            </template>
            <template #fallback> 
                <DeckTemplateSkeleton :amountOfCards="cardsAmount"/>
            </template>
        </Suspense>
    </div>
</template>

<style scoped>
    .content.deck {
        padding: 9vh 0 108px; 
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: auto;            
    }

    .deck button.back {   
        margin: 48px 0;     
        height: 40px;
        background-repeat: no-repeat;
        background-color: transparent;
        background-image: url('../assets/icon/Back.svg');
        filter: drop-shadow(0px 2px 3px rgb(199, 190, 142));
    }

    /* DESKTOP */
    @media screen and (min-width: 769px) {
        .content.deck {
            padding: 40px 0;
        }
    }
    
</style>