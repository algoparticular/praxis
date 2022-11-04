<script setup>
    import Header from '../components/Header.vue';		
    import DeckTemplate from '../components/DeckTemplate.vue';
    import DeckTemplateSkeleton from '../components/DeckTemplateSkeleton.vue';

    import { onBeforeMount, ref } from 'vue'; 
	// import { getAuth } from 'firebase/auth';
	// import { useRouter } from 'vue-router';        

	// const router = useRouter();
	// const auth = getAuth();

	// const authListener = auth.onAuthStateChanged(function(user) {
	// 	if (!user) { // not logged in
	// 		// alert('you must be logged in to view this. redirecting to the home page');
	// 		router.push('/');
	// 	}
	// });

	// onBeforeMount(() => {
	// 	// clear up listener
	// 	authListener();
	// });

    const cardsAmount = ref(33);

</script>

<template>
    <div class="content deck"> 
        <Header 
            :hasBack="true"
            :hasMenu="true"/>
		<!-- <h2>{{ $t("message.praxisCollectionTitle") }}</h2>
		<p>{{ $t("message.praxisCollectionDescrip") }}</p> -->

        <Suspense>
            <template #default>
                <DeckTemplate />
            </template>
            <template #fallback> 
                <DeckTemplateSkeleton :amountOfCards="cardsAmount"/>
            </template>
        </Suspense>
    </div>
</template>

<style scoped>
    
</style>