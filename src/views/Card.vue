<script setup>    
    import CardTemplate from '../components/CardTemplate.vue';
    import CardTemplateSkeleton from '../components/CardTemplateSkeleton.vue';
    import Header from '../components/Header.vue';
</script>

<template>    
    <div class="content">
        <Header 
            :hasBack="true"
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
    .fade-enter-from,
	.fade-leave-to {
		opacity: 0;
	}

	.fade-enter-active,
	.fade-leave-active {
		transition: opacity .3s ease-out;
	}
</style>