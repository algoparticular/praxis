<script setup>    
    import CardTemplate from '../components/CardTemplate.vue';
    import Header from '../components/Header.vue';
</script>

<template>    
    <div class="content cardPage">
        <Header 
            :hasBack="false"
            :hasDeck="true"
            :hasMenu="true"/>
        <!-- The cards are local data, so the page needs no loading state: a scene that is still being fetched
             just fades in over the card's colour once it arrives -->
        <Transition name="fade" mode="out-in">
            <CardTemplate :key="$route.params.id" :id="$route.params.id"/>
        </Transition>
    </div>
</template>

<style>
    /* The page grows with the reading, so the window itself scrolls (the scenes' parallax follows window.scrollY) */
    .content.cardPage {
        height: auto;
        min-height: 100vh;
    }

    /* The header floats over the whole top of the stage: it lets the pointer through, except on its own buttons and menu,
       so whatever is under it (the sun of a scene) can be touched */
    .content.cardPage header {
        pointer-events: none;
    }

    .content.cardPage header button,
    .content.cardPage header a,
    .content.cardPage header #menuOverlay {
        pointer-events: auto;
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