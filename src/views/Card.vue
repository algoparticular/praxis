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
        <Suspense>
            <template #default>
                <CardTemplate :id="$route.params.id"/>
            </template>
            <template #fallback> 
                <CardTemplateSkeleton :id="$route.params.id"/>
            </template>
        </Suspense>
    </div>
</template>

<style>
    
</style>