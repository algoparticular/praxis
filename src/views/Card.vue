<script setup>    
    import CardTemplate from '../components/CardTemplate.vue';
    import CardTemplateSkeleton from '../components/CardTemplateSkeleton.vue';
    import Header from '../components/Header.vue';
</script>

<template>    
    <div class="content cardPage">
        <Header 
            :hasBack="false"
            :hasDeck="true"
            :hasMenu="true"/>
        <Transition name="fade" mode="in-out">
            <KeepAlive>
                <Suspense>
                    <template #default>
                        <CardTemplate :id="$route.params.id"/>
                    </template>
                    <template #fallback> 
                        <CardTemplateSkeleton :id="$route.params.id"/>
                    </template>
                </Suspense>
            </KeepAlive>
        </Transition>
    </div>
</template>

<style>
    /* The page grows with the reading, so the window itself scrolls (the scenes' parallax follows window.scrollY) */
    .content.cardPage {
        height: auto;
        min-height: 100vh;
    }

    .fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}

	.fade-enter-active,
	.fade-leave-active {
		transition: opacity .3s ease-out;
	}
</style>