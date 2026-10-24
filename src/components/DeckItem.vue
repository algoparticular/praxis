<script setup>
    import { ref } from 'vue';

    const props = defineProps({
        id: Number,
        data: Object,
    });

    const emit = defineEmits(['drawCard']);

    const frame = ref(null);

    const drawn = () => {
        emit('drawCard', props.id, frame.value);
    };
</script>

<template>
    <button class="item" @click="drawn()">
        <span class="frame" ref="frame" :style="{ '--glow': props.data.colorAlt }">
            <img :src="'/cards/thumb/' + props.id + '.webp'" :alt="props.data['name_' + $i18n.locale]" loading="lazy"/>
        </span>
        <span class="name">{{ props.data['name_' + $i18n.locale] }}</span>
    </button>
</template>

<style scoped>
    /* Resets the global button look: these are cards, not buttons */
    .item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 100%;
        height: auto;
        padding: 0;
        border-radius: 0;
        background: transparent;
        color: #F7F8F1;
        container-type: inline-size;
    }

    .item:hover,
    .item:focus {
        background: transparent;
        color: #F7F8F1;
        box-shadow: none;
    }

    .item:focus-visible .frame {
        outline: 2px solid #E6E973;
        outline-offset: 4px;
    }

    /* Same proportions as the oracle cards: 1:1.2, frame 2/90 and radius 18/90 of the width */
    .frame {
        display: block;
        box-sizing: border-box;
        width: 100%;
        aspect-ratio: 1 / 1.2;
        border: calc(2 / 90 * 100cqw) solid #F7F8F1;
        border-radius: calc(18 / 90 * 100cqw);
        overflow: hidden;
        background: #143246;
        filter: drop-shadow(0px 2px 3px rgba(234, 234, 234, 0.7));
        transition: transform 250ms ease-out, filter 250ms ease-out;
    }

    .frame img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .item:hover .frame,
    .item:focus-visible .frame {
        transform: translateY(-4px);
        filter: drop-shadow(0px 2px 8px var(--glow, #F7F8F1));
    }

    .name {
        font-family: 'particular', 'Inter', helvetica, sans-serif;
        font-size: 20px;
        line-height: 150%;
        letter-spacing: 0.02em;
        color: #F7F8F1;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (prefers-reduced-motion: reduce) {
        .frame { transition: none; }
    }
</style>
